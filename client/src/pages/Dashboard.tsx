import { useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { HeatmapLayer } from "@/components/MapController";
import type { PropertyResponse } from "@shared/schema";
import { StatsCard } from "@/components/StatsCard";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Map as MapIcon,
  Layers,
  Filter,
  DollarSign,
  TrendingUp,
  Home,
  Download,
  Coffee,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// Los Alamos County Center (calculated from actual data bounds)
const CENTER_LAT = 35.875;
const CENTER_LNG = -106.295;

export default function Dashboard() {
  const [year, setYear] = useState<number>(2025);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 5000000]);
  const [taxRange, setTaxRange] = useState<[number, number]>([0, 50000]);
  const [viewMode, setViewMode] = useState<"heat" | "points">("heat");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [editingTaxMin, setEditingTaxMin] = useState(false);
  const [editingTaxMax, setEditingTaxMax] = useState(false);
  const [tempTaxMin, setTempTaxMin] = useState("");
  const [tempTaxMax, setTempTaxMax] = useState("");
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);
  const taxMinInputRef = useRef<HTMLInputElement>(null);
  const taxMaxInputRef = useRef<HTMLInputElement>(null);

  const handleMinClick = () => {
    setTempMin(String(valueRange[0]));
    setEditingMin(true);
    setTimeout(() => minInputRef.current?.select(), 0);
  };

  const handleMaxClick = () => {
    setTempMax(valueRange[1] >= 5000000 ? "5000000" : String(valueRange[1]));
    setEditingMax(true);
    setTimeout(() => maxInputRef.current?.select(), 0);
  };

  const handleMinSubmit = () => {
    const val = parseInt(tempMin.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, valueRange[1]));
      setValueRange([clamped, valueRange[1]]);
    }
    setEditingMin(false);
  };

  const handleMaxSubmit = () => {
    const val = parseInt(tempMax.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(valueRange[0], Math.min(val, 5000000));
      setValueRange([valueRange[0], clamped]);
    }
    setEditingMax(false);
  };

  const handleTaxMinClick = () => {
    setTempTaxMin(String(taxRange[0]));
    setEditingTaxMin(true);
    setTimeout(() => taxMinInputRef.current?.select(), 0);
  };

  const handleTaxMaxClick = () => {
    setTempTaxMax(taxRange[1] >= 50000 ? "50000" : String(taxRange[1]));
    setEditingTaxMax(true);
    setTimeout(() => taxMaxInputRef.current?.select(), 0);
  };

  const handleTaxMinSubmit = () => {
    const val = parseInt(tempTaxMin.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, taxRange[1]));
      setTaxRange([clamped, taxRange[1]]);
    }
    setEditingTaxMin(false);
  };

  const handleTaxMaxSubmit = () => {
    const val = parseInt(tempTaxMax.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(taxRange[0], Math.min(val, 50000));
      setTaxRange([taxRange[0], clamped]);
    }
    setEditingTaxMax(false);
  };

  // Calculate property tax for a single property
  const getPropertyTax = (p: PropertyResponse) => {
    const totalTaxable = p.totalTaxable || 0;
    const hhExempt = p.hhExemption || 0;
    const vetExempt = p.vetExemption || 0;
    const millLevy = p.millLevy || 28.714;
    const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
    if (isExemptAccount) return 0;
    const netTaxable = Math.max(0, totalTaxable - hhExempt - vetExempt);
    return (netTaxable * millLevy) / 1000;
  };

  // Fetch properties based on filters
  const {
    data: rawProperties,
    isLoading,
    isError,
  } = useProperties({
    year,
    minValue: valueRange[0],
    maxValue: valueRange[1],
  });

  // Filter properties by tax range (client-side since tax is calculated)
  const properties = useMemo(() => {
    if (!rawProperties) return [];
    return rawProperties.filter((p) => {
      const tax = getPropertyTax(p);
      return tax >= taxRange[0] && tax <= taxRange[1];
    });
  }, [rawProperties, taxRange]);

  // Derived Stats
  const stats = useMemo(() => {
    if (!properties || properties.length === 0) return null;

    const totalValue = properties.reduce(
      (acc, curr) => acc + curr.assessedValue,
      0,
    );
    const avgValue = totalValue / properties.length;
    const maxVal = Math.max(...properties.map((p) => p.assessedValue));

    // Simple distribution for chart - start from current filter min
    const minVal = Math.min(...properties.map((p) => p.assessedValue));
    const distribution = [0, 0, 0, 0, 0];
    const rangeSpan = maxVal - minVal;
    const step = rangeSpan / 5;
    properties.forEach((p) => {
      const bucket =
        step > 0
          ? Math.min(Math.floor((p.assessedValue - minVal) / step), 4)
          : 0;
      distribution[bucket]++;
    });

    const chartData = distribution.map((count, i) => ({
      range: `$${((minVal + i * step) / 1000).toFixed(0)}k - $${((minVal + (i + 1) * step) / 1000).toFixed(0)}k`,
      count,
      binMin: Math.round(minVal + i * step),
      binMax: Math.round(minVal + (i + 1) * step),
    }));

    // Calculate total taxes using per-parcel mill levy (excluding EXEMPT properties)
    const totalTaxes = properties.reduce((sum, p) => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExempt = p.hhExemption || 0;
      const vetExempt = p.vetExemption || 0;
      const parcelMillLevy = p.millLevy || 28.714; // Default fallback if not available
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount) return sum; // EXEMPT properties pay $0 tax
      const netTaxable = Math.max(0, totalTaxable - hhExempt - vetExempt);
      return sum + (netTaxable * parcelMillLevy) / 1000;
    }, 0);
    const avgTaxes = properties.length > 0 ? totalTaxes / properties.length : 0;
    const taxPctOfTotal = totalValue > 0 ? (totalTaxes / totalValue) * 100 : 0;
    const taxPctOfAvg = avgValue > 0 ? (avgTaxes / avgValue) * 100 : 0;

    // Count properties with HH exemption
    const hhExemptionCount = properties.filter(p => (p.hhExemption || 0) > 0).length;
    const totalHhExemption = properties.reduce((sum, p) => sum + (p.hhExemption || 0), 0);
    
    // Count properties with Vet exemption
    const vetExemptionCount = properties.filter(p => (p.vetExemption || 0) > 0).length;
    const totalVetExemption = properties.reduce((sum, p) => sum + (p.vetExemption || 0), 0);
    
    // Calculate EXEMPT account type exemptions (grouped by account type)
    const exemptAccountExemptions: Record<string, number> = {};
    properties.forEach(p => {
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount && p.accountType) {
        const totalTaxable = p.totalTaxable || 0;
        const parcelMillLevy = p.millLevy || 28.714;
        const exemptValue = (totalTaxable * parcelMillLevy) / 1000;
        exemptAccountExemptions[p.accountType] = (exemptAccountExemptions[p.accountType] || 0) + exemptValue;
      }
    });
    
    // Build exemptions chart data
    const exemptionsChartData = [
      { type: "HH Exemption", value: totalHhExemption, count: hhExemptionCount },
      { type: "Vet Exemption", value: totalVetExemption, count: vetExemptionCount },
      ...Object.entries(exemptAccountExemptions).map(([type, value]) => ({
        type,
        value,
        count: properties.filter(p => p.accountType === type).length,
      })),
    ].filter(d => d.value > 0);
    
    // Total tax exemptions (sum of all exemption values)
    const totalExemptAccountValue = Object.values(exemptAccountExemptions).reduce((sum, v) => sum + v, 0);
    const totalTaxExemptions = totalHhExemption + totalVetExemption + totalExemptAccountValue;

    // Count properties with no improvement value (land only)
    const landOnlyProps = properties.filter(p => (p.improvementValue || 0) === 0);
    const noImprovementCount = landOnlyProps.length;
    const totalLandOnlySqft = landOnlyProps.reduce((sum, p) => sum + (p.landSqft || 0), 0);

    // Total land square footage
    const totalLandSqft = properties.reduce((sum, p) => sum + (p.landSqft || 0), 0);
    const avgLandSqft = properties.length > 0 ? totalLandSqft / properties.length : 0;

    return {
      totalValue,
      avgValue,
      count: properties.length,
      chartData,
      totalTaxes,
      avgTaxes,
      taxPctOfTotal,
      taxPctOfAvg,
      hhExemptionCount,
      totalHhExemption,
      noImprovementCount,
      totalLandOnlySqft,
      totalLandSqft,
      avgLandSqft,
      exemptionsChartData,
      totalTaxExemptions,
    };
  }, [properties]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);

  const formatCurrencyShort = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);

  // Calculate property tax for a single property using its mill levy
  const calculatePropertyTax = (property: PropertyResponse) => {
    const totalTaxable = property.totalTaxable || 0;
    const hhExempt = property.hhExemption || 0;
    const vetExempt = property.vetExemption || 0;
    const millLevy = property.millLevy || 28.714; // Default fallback
    const netTaxable = Math.max(0, totalTaxable - hhExempt - vetExempt);
    return (netTaxable * millLevy) / 1000;
  };

  const downloadData = () => {
    if (!properties || properties.length === 0) return;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (exportFormat === "json") {
      const jsonData = properties.map((p) => ({
        parcelId: p.parcelId,
        address: p.address,
        owner: p.owner,
        assessedValue: p.assessedValue,
        landValue: p.landValue,
        improvementValue: p.improvementValue,
        landTaxable: p.landTaxable,
        buildingTaxable: p.buildingTaxable,
        totalTaxable: p.totalTaxable,
        hhExemption: p.hhExemption,
        vetExemption: p.vetExemption,
        landSqft: p.landSqft,
        buildingSqft: p.buildingSqft,
        millLevy: p.millLevy,
        parcelAreaAcres: p.parcelArea,
        latitude: p.lat,
        longitude: p.lng,
        assessmentYear: p.assessmentYear,
      }));
      content = JSON.stringify(jsonData, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      const headers = [
        "Parcel ID",
        "Address",
        "Owner",
        "Assessed Value",
        "Land Value",
        "Improvement Value",
        "Land Taxable",
        "Building Taxable",
        "Total Taxable",
        "HH Exemption",
        "Vet Exemption",
        "Land Sqft",
        "Building Sqft",
        "Mill Levy",
        "Parcel Area (acres)",
        "Latitude",
        "Longitude",
        "Assessment Year",
      ];
      const rows = properties.map((p) => [
        p.parcelId,
        `"${(p.address || "").replace(/"/g, '""')}"`,
        `"${(p.owner || "").replace(/"/g, '""')}"`,
        p.assessedValue,
        p.landValue,
        p.improvementValue,
        p.landTaxable || 0,
        p.buildingTaxable || 0,
        p.totalTaxable || 0,
        p.hhExemption || 0,
        p.vetExemption || 0,
        p.landSqft || 0,
        p.buildingSqft || 0,
        p.millLevy || "",
        p.parcelArea?.toFixed(4) || "",
        p.lat,
        p.lng,
        p.assessmentYear,
      ]);
      content = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      mimeType = "text/csv;charset=utf-8;";
      extension = "csv";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `los_alamos_parcels_${year}_${valueRange[0]}-${valueRange[1]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isError) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-destructive">
            Error Loading Data
          </h2>
          <p className="text-muted-foreground">
            Could not fetch property assessments.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex flex-col md:flex-row overflow-hidden relative">
      {/* Sidebar Control Panel */}
      <div className="w-full md:w-[400px] z-20 flex flex-col h-full bg-card/95 backdrop-blur-md border-r border-border shadow-2xl shrink-0 overflow-y-auto">
        <div className="p-6 space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Los Alamos Assessor
              </h1>
              <a
                href="http://venmo.com/werni"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="link-buy-coffee"
              >
                <Button variant="outline" size="sm" className="gap-1">
                  <Coffee className="h-4 w-4" />
                  <span className="hidden sm:inline">Buy me a coffee</span>
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Interactive land value assessment heatmap and analytics platform.
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-6 bg-secondary/30 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Assessment Year
                </label>
                <Select
                  value={year.toString()}
                  onValueChange={(v) => setYear(Number(v))}
                >
                  <SelectTrigger
                    className="w-full bg-background/50 border-border"
                    data-testid="select-year"
                  >
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assessed Value Range
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingMin ? (
                      <input
                        ref={minInputRef}
                        type="text"
                        value={tempMin}
                        onChange={(e) => setTempMin(e.target.value)}
                        onBlur={handleMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleMinSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-primary rounded text-right"
                        data-testid="input-min-value"
                      />
                    ) : (
                      <button
                        onClick={handleMinClick}
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="button-edit-min"
                      >
                        {formatCurrencyShort(valueRange[0])}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingMax ? (
                      <input
                        ref={maxInputRef}
                        type="text"
                        value={tempMax}
                        onChange={(e) => setTempMax(e.target.value)}
                        onBlur={handleMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleMaxSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-primary rounded text-right"
                        data-testid="input-max-value"
                      />
                    ) : (
                      <button
                        onClick={handleMaxClick}
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="button-edit-max"
                      >
                        {valueRange[1] >= 5000000
                          ? "5M+"
                          : formatCurrencyShort(valueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  defaultValue={[0, 5000000]}
                  max={5000000}
                  step={50000}
                  value={valueRange}
                  onValueChange={(val) =>
                    setValueRange(val as [number, number])
                  }
                  className="py-2"
                  data-testid="slider-value-range"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Property Taxes Paid
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingTaxMin ? (
                      <input
                        ref={taxMinInputRef}
                        type="text"
                        value={tempTaxMin}
                        onChange={(e) => setTempTaxMin(e.target.value)}
                        onBlur={handleTaxMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleTaxMinSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-primary rounded text-right"
                        data-testid="input-tax-min"
                      />
                    ) : (
                      <button
                        onClick={handleTaxMinClick}
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="button-edit-tax-min"
                      >
                        {formatCurrencyShort(taxRange[0])}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingTaxMax ? (
                      <input
                        ref={taxMaxInputRef}
                        type="text"
                        value={tempTaxMax}
                        onChange={(e) => setTempTaxMax(e.target.value)}
                        onBlur={handleTaxMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleTaxMaxSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-primary rounded text-right"
                        data-testid="input-tax-max"
                      />
                    ) : (
                      <button
                        onClick={handleTaxMaxClick}
                        className="text-primary hover:underline cursor-pointer"
                        data-testid="button-edit-tax-max"
                      >
                        {taxRange[1] >= 50000
                          ? "$50k+"
                          : formatCurrencyShort(taxRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  defaultValue={[0, 50000]}
                  max={50000}
                  step={500}
                  value={taxRange}
                  onValueChange={(val) =>
                    setTaxRange(val as [number, number])
                  }
                  className="py-2"
                  data-testid="slider-tax-range"
                />
              </div>

              <div className="pt-2">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                  Visualization Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={viewMode === "heat" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("heat")}
                    className="w-full"
                    data-testid="button-heatmap"
                  >
                    <Layers className="w-4 h-4 mr-2" /> Heatmap
                  </Button>
                  <Button
                    variant={viewMode === "points" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("points")}
                    className="w-full"
                    data-testid="button-markers"
                  >
                    <MapIcon className="w-4 h-4 mr-2" /> Markers
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-border/50">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-2">
                  Export Data
                </label>
                <div className="space-y-2">
                  <Select
                    value={exportFormat}
                    onValueChange={(v) => setExportFormat(v as "csv" | "json")}
                  >
                    <SelectTrigger
                      className="w-full bg-background/50 border-border"
                      data-testid="select-export-format"
                    >
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                      <SelectItem value="json">JSON (Data)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={downloadData}
                    disabled={
                      !properties || properties.length === 0 || isLoading
                    }
                    className="w-full"
                    size="sm"
                    data-testid="button-download"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download {properties?.length || 0} Properties
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Summary */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading assessment data...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <StatsCard
                title="Total Assessed Value"
                value={formatCurrencyShort(stats.totalValue)}
                icon={DollarSign}
                description={`Avg: ${formatCurrencyShort(stats.avgValue)}`}
              />
              <StatsCard
                title="Total Land Sqft"
                value={stats.totalLandSqft.toLocaleString()}
                icon={TrendingUp}
                description={`Avg: ${Math.round(stats.avgLandSqft).toLocaleString()} sqft`}
              />
              <StatsCard
                title="Total Taxes Paid"
                value={formatCurrencyShort(stats.totalTaxes)}
                icon={DollarSign}
                description={`Avg: ${formatCurrencyShort(stats.avgTaxes)} (${stats.taxPctOfTotal.toFixed(2)}% eff. rate)`}
              />
              <StatsCard
                title="Total Tax Exemptions"
                value={formatCurrencyShort(stats.totalTaxExemptions)}
                icon={DollarSign}
                description="All exemption types combined"
              />
              <div className="grid grid-cols-2 gap-4">
                <StatsCard
                  title="Properties"
                  value={stats.count.toLocaleString()}
                  icon={Home}
                />
                <StatsCard
                  title="HH Exemptions"
                  value={stats.hhExemptionCount.toLocaleString()}
                  icon={Home}
                  description="Head of Household (owner-occupied)"
                />
              </div>
              <StatsCard
                title="Land Only (No Improvements)"
                value={stats.noImprovementCount.toLocaleString()}
                icon={Layers}
                description={`${stats.totalLandOnlySqft.toLocaleString()} total sqft`}
              />

              {/* Chart */}
              <div className="h-48 pt-4">
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                  Value Distribution
                </label>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <XAxis dataKey="range" hide />
                    <YAxis hide />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "hsl(222 47% 11%)",
                        borderColor: "hsl(217 33% 17%)",
                        borderRadius: "8px",
                      }}
                      itemStyle={{ color: "white" }}
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(199 89% 48%)"
                      radius={[4, 4, 0, 0]}
                      className="cursor-pointer"
                      onClick={(data) => {
                        if (
                          data &&
                          data.binMin !== undefined &&
                          data.binMax !== undefined
                        ) {
                          setValueRange([
                            data.binMin,
                            Math.min(data.binMax, 5000000),
                          ]);
                        }
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tax Exemptions Chart */}
              {stats.exemptionsChartData && stats.exemptionsChartData.length > 0 && (
                <div className="h-64 pt-4">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                    Tax Exemptions by Type
                  </label>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={stats.exemptionsChartData} 
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="type" 
                        width={100}
                        tick={{ fontSize: 10, fill: "hsl(215 20% 65%)" }}
                        tickFormatter={(value) => value.replace("EXEMPT ", "")}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(222 47% 11%)",
                          borderColor: "hsl(217 33% 17%)",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "white" }}
                        formatter={(value: number, name: string) => {
                          if (name === "value") {
                            return [formatCurrencyShort(value), "Total Value"];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label) => label}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      />
                      <Bar
                        dataKey="value"
                        fill="hsl(142 71% 45%)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No data available for selected range.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-auto p-6 border-t border-border text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Los Alamos Assessment Viz.</p>
          <p className="mt-1">Data provided by County Assessor.</p>
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-[50vh] md:h-full w-full bg-slate-900">
        <div className="absolute inset-0 z-0">
          <MapContainer
            center={[CENTER_LAT, CENTER_LNG]}
            zoom={11}
            scrollWheelZoom={true}
            className="h-full w-full"
            data-testid="map-container"
          >
            {/* Dark Mode Map Tiles - CartoDB Dark Matter */}
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {properties && viewMode === "heat" && (
              <HeatmapLayer points={properties} />
            )}

            {properties &&
              viewMode === "points" &&
              properties.map((property) => {
                const landVal = property.landValue || 0;
                const improvVal = property.improvementValue || 0;
                const landTaxableVal = property.landTaxable || 0;
                const bldgTaxableVal = property.buildingTaxable || 0;
                const totalTaxableVal = property.totalTaxable || 0;
                const hhExemptVal = property.hhExemption || 0;
                const vetExemptVal = property.vetExemption || 0;
                const landSqftVal = property.landSqft || 0;
                const bldgSqftVal = property.buildingSqft || 0;

                // Price per sqft calculations
                const landPricePerSqft =
                  landSqftVal > 0 && landVal > 0
                    ? (landVal / landSqftVal).toFixed(2)
                    : null;
                const improvPricePerSqft =
                  bldgSqftVal > 0 && improvVal > 0
                    ? (improvVal / bldgSqftVal).toFixed(2)
                    : null;

                // Property taxes: (Total Taxable - HH Exemption - Vet Exemption) * Mill Levy / 1000
                const parcelMillLevy = property.millLevy || 28.714;
                
                // Check if this is an EXEMPT account type
                const isExemptAccount = property.accountType?.toUpperCase().includes("EXEMPT") || false;
                const exemptAccountExemption = isExemptAccount ? (totalTaxableVal * parcelMillLevy) / 1000 : 0;
                
                const netTaxable = isExemptAccount ? 0 : Math.max(
                  0,
                  totalTaxableVal - hhExemptVal - vetExemptVal,
                );
                const propertyTax = isExemptAccount ? 0 : (netTaxable * parcelMillLevy) / 1000;

                // Tax per sqft calculations - separate for land and improvements
                const landTax = (landTaxableVal * parcelMillLevy) / 1000;
                const bldgTax = (bldgTaxableVal * parcelMillLevy) / 1000;
                const landTaxPerSqft =
                  landSqftVal > 0 ? (landTax / landSqftVal).toFixed(4) : null;
                const bldgTaxPerSqft =
                  bldgSqftVal > 0 ? (bldgTax / bldgSqftVal).toFixed(4) : null;

                const hasHhExemption = hhExemptVal > 0;
                const hasVetExemption = vetExemptVal > 0;

                return (
                  <Marker
                    key={property.id}
                    position={[property.lat, property.lng]}
                  >
                    <Popup className="bg-transparent border-none shadow-none">
                      <div className="p-1 min-w-[260px]">
                        <h3 className="font-bold text-sm mb-1">
                          {property.address}
                        </h3>
                        <div className="text-xs space-y-1 text-muted-foreground">
                          <p>
                            Owner:{" "}
                            <span className="text-foreground">
                              {property.owner}
                            </span>
                          </p>
                          <p>
                            Total Value:{" "}
                            <span className="text-primary font-bold">
                              {formatCurrency(property.assessedValue)}
                            </span>
                          </p>
                          <p>
                            Land: {formatCurrency(landVal)}
                            {landSqftVal > 0 && landPricePerSqft && (
                              <span className="text-foreground">
                                {" "}/ {landSqftVal.toLocaleString()} sqft = ${landPricePerSqft}/sqft
                              </span>
                            )}
                          </p>
                          <p>
                            Bldg: {formatCurrency(improvVal)}
                            {bldgSqftVal > 0 && improvPricePerSqft && (
                              <span className="text-foreground">
                                {" "}/ {Math.round(bldgSqftVal).toLocaleString()} sqft = ${improvPricePerSqft}/sqft
                              </span>
                            )}
                          </p>
                          {(hasHhExemption || hasVetExemption || isExemptAccount) && (
                            <p className="text-green-500">
                              Exemptions:{" "}
                              {hasHhExemption &&
                                `HH ${formatCurrency(hhExemptVal)}`}
                              {hasHhExemption && hasVetExemption && ", "}
                              {hasVetExemption &&
                                `Vet ${formatCurrency(vetExemptVal)}`}
                              {(hasHhExemption || hasVetExemption) && isExemptAccount && ", "}
                              {isExemptAccount &&
                                `${property.accountType} ${formatCurrency(exemptAccountExemption)}`}
                            </p>
                          )}
                          <p className="font-semibold text-amber-500">
                            Property Tax Paid: {formatCurrency(propertyTax)} ({parcelMillLevy.toFixed(3)} mills)
                          </p>
                          {(landTaxPerSqft || bldgTaxPerSqft) && (
                            <p>
                              Tax/sqft:{" "}
                              {landTaxPerSqft && (
                                <span className="text-foreground">
                                  Land ${landTaxPerSqft}
                                </span>
                              )}
                              {landTaxPerSqft && bldgTaxPerSqft && " | "}
                              {bldgTaxPerSqft && (
                                <span className="text-foreground">
                                  Bldg ${bldgTaxPerSqft}
                                </span>
                              )}
                            </p>
                          )}
                          <p>Year: {property.assessmentYear}</p>
                          {property.accountType && (
                            <p>
                              Account Type:{" "}
                              <span className="text-foreground">
                                {property.accountType}
                              </span>
                            </p>
                          )}
                          <a
                            href={`https://www.zillow.com/homes/${encodeURIComponent(property.address)}%20${encodeURIComponent(property.city || "Los Alamos")}%20${encodeURIComponent(property.state || "NM")}%20${encodeURIComponent(property.zip || "87544")}_rb/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline block mt-2"
                            data-testid="link-zillow"
                          >
                            View on Zillow
                          </a>
                          <a
                            href="https://eaglerecorderselfservice.losalamosnm.us/web/search/DOCSEARCH138S1"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline block mt-1"
                            data-testid="link-county-clerk"
                          >
                            County Clerk Records
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        </div>

        {/* Floating Map Controls overlay if needed (zoom handled by Leaflet default) */}
        <div className="absolute top-4 right-4 z-[400] md:hidden">
          {/* Mobile indicator or simple legend could go here */}
        </div>
      </div>
    </div>
  );
}
