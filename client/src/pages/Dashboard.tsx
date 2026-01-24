import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { HeatmapLayer } from "@/components/MapController";
import type { PropertyResponse } from "@shared/schema";
import { StatsCard } from "@/components/StatsCard";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Map as MapIcon, Layers, Filter, DollarSign, TrendingUp, Home, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// Los Alamos County Center (calculated from actual data bounds)
const CENTER_LAT = 35.875;
const CENTER_LNG = -106.295;

export default function Dashboard() {
  const [year, setYear] = useState<number>(2025);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 5000000]);
  const [viewMode, setViewMode] = useState<"heat" | "points">("heat");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Fetch properties based on filters
  const { data: properties, isLoading, isError } = useProperties({
    year,
    minValue: valueRange[0],
    maxValue: valueRange[1]
  });

  // Derived Stats
  const stats = useMemo(() => {
    if (!properties || properties.length === 0) return null;
    
    const totalValue = properties.reduce((acc, curr) => acc + curr.assessedValue, 0);
    const avgValue = totalValue / properties.length;
    const maxVal = Math.max(...properties.map(p => p.assessedValue));

    // Simple distribution for chart
    const distribution = [0, 0, 0, 0, 0];
    const step = maxVal / 5;
    properties.forEach(p => {
      const bucket = Math.min(Math.floor(p.assessedValue / step), 4);
      distribution[bucket]++;
    });

    const chartData = distribution.map((count, i) => ({
      range: `$${(i * step / 1000).toFixed(0)}k - $${((i + 1) * step / 1000).toFixed(0)}k`,
      count
    }));

    // Calculate total taxes
    const millLevy = 28.714;
    const totalTaxes = properties.reduce((sum, p) => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExempt = p.hhExemption || 0;
      const vetExempt = p.vetExemption || 0;
      const netTaxable = Math.max(0, totalTaxable - hhExempt - vetExempt);
      return sum + (netTaxable * millLevy) / 1000;
    }, 0);
    const avgTaxes = properties.length > 0 ? totalTaxes / properties.length : 0;
    const taxPctOfTotal = totalValue > 0 ? (totalTaxes / totalValue) * 100 : 0;
    const taxPctOfAvg = avgValue > 0 ? (avgTaxes / avgValue) * 100 : 0;

    return { totalValue, avgValue, count: properties.length, chartData, totalTaxes, avgTaxes, taxPctOfTotal, taxPctOfAvg };
  }, [properties]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  
  const formatCurrencyShort = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  
  // Los Alamos County 2025 Mill Levy (Tax Area 1N - most common residential area)
  const MILL_LEVY = 28.714;
  
  // Calculate property tax for a single property
  const calculatePropertyTax = (property: PropertyResponse) => {
    const totalTaxable = property.totalTaxable || 0;
    const hhExempt = property.hhExemption || 0;
    const vetExempt = property.vetExemption || 0;
    const netTaxable = Math.max(0, totalTaxable - hhExempt - vetExempt);
    return (netTaxable * MILL_LEVY) / 1000;
  };

  const downloadData = () => {
    if (!properties || properties.length === 0) return;
    
    let content: string;
    let mimeType: string;
    let extension: string;
    
    if (exportFormat === 'json') {
      const jsonData = properties.map(p => ({
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
        parcelAreaAcres: p.parcelArea,
        latitude: p.lat,
        longitude: p.lng,
        assessmentYear: p.assessmentYear
      }));
      content = JSON.stringify(jsonData, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      const headers = ['Parcel ID', 'Address', 'Owner', 'Assessed Value', 'Land Value', 'Improvement Value', 'Land Taxable', 'Building Taxable', 'Total Taxable', 'HH Exemption', 'Vet Exemption', 'Land Sqft', 'Building Sqft', 'Parcel Area (acres)', 'Latitude', 'Longitude', 'Assessment Year'];
      const rows = properties.map(p => [
        p.parcelId,
        `"${(p.address || '').replace(/"/g, '""')}"`,
        `"${(p.owner || '').replace(/"/g, '""')}"`,
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
        p.parcelArea?.toFixed(4) || '',
        p.lat,
        p.lng,
        p.assessmentYear
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
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
          <h2 className="text-2xl font-bold text-destructive">Error Loading Data</h2>
          <p className="text-muted-foreground">Could not fetch property assessments.</p>
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
            <h1 className="text-2xl font-display font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Los Alamos Assessor
            </h1>
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
                <Select value={year.toString()} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-full bg-background/50 border-border" data-testid="select-year">
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
                  <span className="text-xs text-primary font-mono">
                    {formatCurrencyShort(valueRange[0])} - {valueRange[1] >= 5000000 ? "5M+" : formatCurrencyShort(valueRange[1])}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 5000000]}
                  max={5000000}
                  step={50000}
                  value={valueRange}
                  onValueChange={(val) => setValueRange(val as [number, number])}
                  className="py-2"
                  data-testid="slider-value-range"
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
                  <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as "csv" | "json")}>
                    <SelectTrigger className="w-full bg-background/50 border-border" data-testid="select-export-format">
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                      <SelectItem value="json">JSON (Data)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={downloadData}
                    disabled={!properties || properties.length === 0 || isLoading}
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
                description="Cumulative value of filtered properties"
              />
              <StatsCard 
                title="Total Taxes Paid" 
                value={`${formatCurrencyShort(stats.totalTaxes)} (${stats.taxPctOfTotal.toFixed(2)}%)`} 
                icon={DollarSign}
                description="Total property taxes of filtered properties"
              />
              <div className="grid grid-cols-2 gap-4">
                <StatsCard 
                  title="Avg. Value" 
                  value={formatCurrencyShort(stats.avgValue)} 
                  icon={TrendingUp}
                />
                <StatsCard 
                  title="Avg. Taxes" 
                  value={`${formatCurrencyShort(stats.avgTaxes)} (${stats.taxPctOfAvg.toFixed(2)}%)`} 
                  icon={TrendingUp}
                />
              </div>
              <StatsCard 
                title="Properties" 
                value={stats.count.toLocaleString()} 
                icon={Home}
              />

              {/* Chart */}
              <div className="h-48 pt-4">
                 <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                    Value Distribution
                  </label>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <XAxis 
                      dataKey="range" 
                      hide 
                    />
                    <YAxis hide />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: 'hsl(222 47% 11%)', borderColor: 'hsl(217 33% 17%)', borderRadius: '8px' }}
                      itemStyle={{ color: 'white' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(199 89% 48%)" 
                      radius={[4, 4, 0, 0]} 
                      className="hover:opacity-80 transition-opacity"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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

            {properties && viewMode === "points" && properties.map(property => {
              const landVal = property.landValue || 0;
              const improvVal = property.improvementValue || 0;
              const landTaxableVal = property.landTaxable || 0;
              const bldgTaxableVal = property.buildingTaxable || 0;
              const totalTaxableVal = property.totalTaxable || 0;
              const hhExemptVal = property.hhExemption || 0;
              const vetExemptVal = property.vetExemption || 0;
              const landSqftVal = property.landSqft || 0;
              
              const landTaxPct = landVal > 0 && landTaxableVal > 0 
                ? ((landTaxableVal / landVal) * 100).toFixed(1) 
                : null;
              const bldgTaxPct = improvVal > 0 && bldgTaxableVal > 0 
                ? ((bldgTaxableVal / improvVal) * 100).toFixed(1) 
                : null;
              const pricePerSqft = landSqftVal > 0 && landVal > 0 
                ? (landVal / landSqftVal).toFixed(2) 
                : null;
              
              // Property taxes: (Total Taxable - HH Exemption - Vet Exemption) * Mill Levy / 1000
              const netTaxable = Math.max(0, totalTaxableVal - hhExemptVal - vetExemptVal);
              const propertyTax = (netTaxable * MILL_LEVY) / 1000;
              const taxPerSqft = landSqftVal > 0 ? (propertyTax / landSqftVal).toFixed(4) : null;
              
              const hasHhExemption = hhExemptVal > 0;
              const hasVetExemption = vetExemptVal > 0;
              
              return (
                <Marker 
                  key={property.id} 
                  position={[property.lat, property.lng]}
                >
                  <Popup className="bg-transparent border-none shadow-none">
                    <div className="p-1 min-w-[260px]">
                      <h3 className="font-bold text-sm mb-1">{property.address}</h3>
                      <div className="text-xs space-y-1 text-muted-foreground">
                        <p>Owner: <span className="text-foreground">{property.owner}</span></p>
                        <p>Total Value: <span className="text-primary font-bold">{formatCurrency(property.assessedValue)}</span></p>
                        <p>Land: {formatCurrency(landVal)} {landTaxPct && <span className="text-muted-foreground">({landTaxPct}% taxable)</span>}</p>
                        <p>Improvements: {formatCurrency(improvVal)} {bldgTaxPct && <span className="text-muted-foreground">({bldgTaxPct}% taxable)</span>}</p>
                        {pricePerSqft && <p>Land $/sqft: <span className="text-foreground">${pricePerSqft}</span></p>}
                        {(hasHhExemption || hasVetExemption) && (
                          <p className="text-green-500">
                            Exemptions: {hasHhExemption && `HH ${formatCurrency(hhExemptVal)}`}{hasHhExemption && hasVetExemption && ', '}{hasVetExemption && `Vet ${formatCurrency(vetExemptVal)}`}
                          </p>
                        )}
                        <p className="font-semibold text-amber-500">Property Tax: {formatCurrency(propertyTax)}</p>
                        {taxPerSqft && <p>Tax/sqft: <span className="text-foreground">${taxPerSqft}</span></p>}
                        <p>Year: {property.assessmentYear}</p>
                      </div>
                    </div>
                  </Popup>
                  <Tooltip permanent={false} sticky>
                    <div className="text-xs">
                      <div className="font-bold">{formatCurrency(property.assessedValue)}</div>
                      <div>Land: {formatCurrency(landVal)} {landTaxPct && `(${landTaxPct}%)`}</div>
                      <div>Bldg: {formatCurrency(improvVal)} {bldgTaxPct && `(${bldgTaxPct}%)`}</div>
                      {pricePerSqft && <div>${pricePerSqft}/sqft land</div>}
                      {(hasHhExemption || hasVetExemption) && (
                        <div className="text-green-600">
                          {hasHhExemption && `HH: ${formatCurrency(hhExemptVal)}`}
                          {hasHhExemption && hasVetExemption && ' '}
                          {hasVetExemption && `Vet: ${formatCurrency(vetExemptVal)}`}
                        </div>
                      )}
                      <div className="font-semibold text-amber-500">Tax: {formatCurrency(propertyTax)}</div>
                      {taxPerSqft && <div>${taxPerSqft}/sqft tax</div>}
                    </div>
                  </Tooltip>
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
