import { useState, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { ClusterLayer } from "@/components/MapController";
import type { PropertyResponse } from "@shared/schema";
import { StatsCard } from "@/components/StatsCard";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Layers,
  Filter,
  DollarSign,
  TrendingUp,
  Home,
  Download,
  Coffee,
  ChevronDown,
  BarChart3,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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

function MapResizeHandler({ collapsed }: { collapsed: boolean }) {
  const map = useMap();
  
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 350);
  }, [collapsed, map]);
  
  return null;
}

const TILE_LAYERS = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: "Street"
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    name: "Satellite"
  }
};

export default function Dashboard() {
  const [year, setYear] = useState<number>(2025);
  const [mapLayer, setMapLayer] = useState<"street" | "satellite">("street");
  const [valueRange, setValueRange] = useState<[number, number]>([0, 5000000]);
  const [taxRange, setTaxRange] = useState<[number, number]>([0, 50000]);
  const [parcelAreaRange, setParcelAreaRange] = useState<[number, number]>([0, 100]);
  const [landValueRange, setLandValueRange] = useState<[number, number]>([0, 2000000]);
  const [improvementValueRange, setImprovementValueRange] = useState<[number, number]>([0, 5000000]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [editingTaxMin, setEditingTaxMin] = useState(false);
  const [editingTaxMax, setEditingTaxMax] = useState(false);
  const [tempTaxMin, setTempTaxMin] = useState("");
  const [tempTaxMax, setTempTaxMax] = useState("");
  const [editingParcelMin, setEditingParcelMin] = useState(false);
  const [editingParcelMax, setEditingParcelMax] = useState(false);
  const [tempParcelMin, setTempParcelMin] = useState("");
  const [tempParcelMax, setTempParcelMax] = useState("");
  const [editingLandValueMin, setEditingLandValueMin] = useState(false);
  const [editingLandValueMax, setEditingLandValueMax] = useState(false);
  const [tempLandValueMin, setTempLandValueMin] = useState("");
  const [tempLandValueMax, setTempLandValueMax] = useState("");
  const [editingImprovementMin, setEditingImprovementMin] = useState(false);
  const [editingImprovementMax, setEditingImprovementMax] = useState(false);
  const [tempImprovementMin, setTempImprovementMin] = useState("");
  const [tempImprovementMax, setTempImprovementMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);
  const taxMinInputRef = useRef<HTMLInputElement>(null);
  const taxMaxInputRef = useRef<HTMLInputElement>(null);
  const parcelMinInputRef = useRef<HTMLInputElement>(null);
  const parcelMaxInputRef = useRef<HTMLInputElement>(null);
  const landValueMinInputRef = useRef<HTMLInputElement>(null);
  const landValueMaxInputRef = useRef<HTMLInputElement>(null);
  const improvementMinInputRef = useRef<HTMLInputElement>(null);
  const improvementMaxInputRef = useRef<HTMLInputElement>(null);

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

  // Parcel Area handlers
  const handleParcelMinClick = () => {
    setTempParcelMin(String(parcelAreaRange[0]));
    setEditingParcelMin(true);
    setTimeout(() => parcelMinInputRef.current?.select(), 0);
  };

  const handleParcelMaxClick = () => {
    setTempParcelMax(parcelAreaRange[1] >= 100 ? "100" : String(parcelAreaRange[1]));
    setEditingParcelMax(true);
    setTimeout(() => parcelMaxInputRef.current?.select(), 0);
  };

  const handleParcelMinSubmit = () => {
    const val = parseFloat(tempParcelMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, parcelAreaRange[1]));
      setParcelAreaRange([clamped, parcelAreaRange[1]]);
    }
    setEditingParcelMin(false);
  };

  const handleParcelMaxSubmit = () => {
    const val = parseFloat(tempParcelMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(parcelAreaRange[0], Math.min(val, 100));
      setParcelAreaRange([parcelAreaRange[0], clamped]);
    }
    setEditingParcelMax(false);
  };

  // Land Value handlers
  const handleLandValueMinClick = () => {
    setTempLandValueMin(String(landValueRange[0]));
    setEditingLandValueMin(true);
    setTimeout(() => landValueMinInputRef.current?.select(), 0);
  };

  const handleLandValueMaxClick = () => {
    setTempLandValueMax(landValueRange[1] >= 2000000 ? "2000000" : String(landValueRange[1]));
    setEditingLandValueMax(true);
    setTimeout(() => landValueMaxInputRef.current?.select(), 0);
  };

  const handleLandValueMinSubmit = () => {
    const val = parseInt(tempLandValueMin.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, landValueRange[1]));
      setLandValueRange([clamped, landValueRange[1]]);
    }
    setEditingLandValueMin(false);
  };

  const handleLandValueMaxSubmit = () => {
    const val = parseInt(tempLandValueMax.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(landValueRange[0], Math.min(val, 2000000));
      setLandValueRange([landValueRange[0], clamped]);
    }
    setEditingLandValueMax(false);
  };

  // Improvement Value handlers
  const handleImprovementMinClick = () => {
    setTempImprovementMin(String(improvementValueRange[0]));
    setEditingImprovementMin(true);
    setTimeout(() => improvementMinInputRef.current?.select(), 0);
  };

  const handleImprovementMaxClick = () => {
    setTempImprovementMax(improvementValueRange[1] >= 5000000 ? "5000000" : String(improvementValueRange[1]));
    setEditingImprovementMax(true);
    setTimeout(() => improvementMaxInputRef.current?.select(), 0);
  };

  const handleImprovementMinSubmit = () => {
    const val = parseInt(tempImprovementMin.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, improvementValueRange[1]));
      setImprovementValueRange([clamped, improvementValueRange[1]]);
    }
    setEditingImprovementMin(false);
  };

  const handleImprovementMaxSubmit = () => {
    const val = parseInt(tempImprovementMax.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(val)) {
      const clamped = Math.max(improvementValueRange[0], Math.min(val, 5000000));
      setImprovementValueRange([improvementValueRange[0], clamped]);
    }
    setEditingImprovementMax(false);
  };

  // Calculate property tax for a single property
  // Formula: (Total Taxable × Mill Levy) - (HH Exemption × Mill Levy) - (Vet Exemption × Mill Levy)
  const getPropertyTax = (p: PropertyResponse) => {
    const totalTaxable = p.totalTaxable || 0;
    const hhExemptValue = p.hhExemption || 0;
    const vetExemptValue = p.vetExemption || 0;
    const millLevy = p.millLevy || 28.714;
    const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
    if (isExemptAccount) return 0;
    
    // Calculate tax amounts
    const grossTax = (totalTaxable * millLevy) / 1000;
    const hhExemptionAmount = (hhExemptValue * millLevy) / 1000;
    const vetExemptionAmount = (vetExemptValue * millLevy) / 1000;
    
    return Math.max(0, grossTax - hhExemptionAmount - vetExemptionAmount);
  };
  
  // Helper to get exemption amounts (as tax dollars saved)
  const getHhExemptionAmount = (p: PropertyResponse) => {
    const millLevy = p.millLevy || 28.714;
    return ((p.hhExemption || 0) * millLevy) / 1000;
  };
  
  const getVetExemptionAmount = (p: PropertyResponse) => {
    const millLevy = p.millLevy || 28.714;
    return ((p.vetExemption || 0) * millLevy) / 1000;
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

  // Get unique account types from raw data
  const uniqueAccountTypes = useMemo(() => {
    if (!rawProperties) return [];
    const types = new Set<string>();
    rawProperties.forEach((p) => {
      if (p.accountType) types.add(p.accountType);
    });
    return Array.from(types).sort();
  }, [rawProperties]);

  // Filter properties by value, tax range, parcel area, land value, and improvement value (without account type filter)
  // Used to calculate account type counts based on current other filters
  const propertiesWithoutAccountTypeFilter = useMemo(() => {
    if (!rawProperties) return [];
    return rawProperties.filter((p) => {
      const tax = getPropertyTax(p);
      const parcelArea = p.parcelArea || 0;
      const landValue = p.landValue || 0;
      const improvementValue = p.improvementValue || 0;
      return (
        tax >= taxRange[0] &&
        tax <= taxRange[1] &&
        parcelArea >= parcelAreaRange[0] &&
        parcelArea <= parcelAreaRange[1] &&
        landValue >= landValueRange[0] &&
        landValue <= landValueRange[1] &&
        improvementValue >= improvementValueRange[0] &&
        improvementValue <= improvementValueRange[1]
      );
    });
  }, [rawProperties, taxRange, parcelAreaRange, landValueRange, improvementValueRange]);

  // Filter properties by tax range, land sqft, account types, and owner (client-side)
  const properties = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    // Account type filter
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((p) =>
        p.accountType && selectedAccountTypes.includes(p.accountType)
      );
    }
    
    // Owner filter
    if (ownerFilter.trim()) {
      const searchTerm = ownerFilter.trim();
      if (useRegex) {
        try {
          const regex = new RegExp(searchTerm, "i");
          filtered = filtered.filter((p) => p.owner && regex.test(p.owner));
        } catch {
          // Invalid regex, fall back to literal match
          const lowerSearch = searchTerm.toLowerCase();
          filtered = filtered.filter((p) => 
            p.owner && p.owner.toLowerCase().includes(lowerSearch)
          );
        }
      } else {
        const lowerSearch = searchTerm.toLowerCase();
        filtered = filtered.filter((p) => 
          p.owner && p.owner.toLowerCase().includes(lowerSearch)
        );
      }
    }
    
    return filtered;
  }, [propertiesWithoutAccountTypeFilter, selectedAccountTypes, ownerFilter, useRegex]);

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

    // Tax histogram data (5 bins from 0 to max tax)
    const taxValues = properties.map(p => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExempt = p.hhExemption || 0;
      const vetExempt = p.vetExemption || 0;
      const parcelMillLevy = p.millLevy || 28.714;
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount) return 0;
      return Math.max(0, totalTaxable - hhExempt - vetExempt) * parcelMillLevy / 1000;
    });
    // Tax histogram uses actual min/max from filtered data
    const actualTaxMin = taxValues.length > 0 ? Math.min(...taxValues) : 0;
    const actualTaxMax = taxValues.length > 0 ? Math.max(...taxValues) : 1;
    const taxDistribution = [0, 0, 0, 0, 0];
    const taxStep = (actualTaxMax - actualTaxMin) / 5;
    taxValues.forEach(tax => {
      const bucket = taxStep > 0 ? Math.min(Math.floor((tax - actualTaxMin) / taxStep), 4) : 0;
      taxDistribution[bucket]++;
    });
    const taxChartData = taxDistribution.map((count, i) => ({
      range: `$${((actualTaxMin + i * taxStep) / 1000).toFixed(1)}k - $${((actualTaxMin + (i + 1) * taxStep) / 1000).toFixed(1)}k`,
      count,
      binMin: Math.round(actualTaxMin + i * taxStep),
      binMax: Math.round(actualTaxMin + (i + 1) * taxStep),
    }));

    // Parcel area histogram uses actual min/max from filtered data
    const parcelAreas = properties.map(p => p.parcelArea || 0);
    const actualParcelMin = parcelAreas.length > 0 ? Math.min(...parcelAreas) : 0;
    const actualParcelMax = parcelAreas.length > 0 ? Math.max(...parcelAreas) : 1;
    const parcelDistribution = [0, 0, 0, 0, 0];
    const parcelStep = (actualParcelMax - actualParcelMin) / 5;
    parcelAreas.forEach(area => {
      const bucket = parcelStep > 0 ? Math.min(Math.floor((area - actualParcelMin) / parcelStep), 4) : 0;
      parcelDistribution[bucket]++;
    });
    const parcelChartData = parcelDistribution.map((count, i) => ({
      range: `${(actualParcelMin + i * parcelStep).toFixed(1)} - ${(actualParcelMin + (i + 1) * parcelStep).toFixed(1)} ac`,
      count,
      binMin: actualParcelMin + i * parcelStep,
      binMax: actualParcelMin + (i + 1) * parcelStep,
    }));

    // Land value histogram
    const landValues = properties.map(p => p.landValue || 0);
    const actualLandMin = landValues.length > 0 ? Math.min(...landValues) : 0;
    const actualLandMax = landValues.length > 0 ? Math.max(...landValues) : 1;
    const landDistribution = [0, 0, 0, 0, 0];
    const landStep = (actualLandMax - actualLandMin) / 5;
    landValues.forEach(val => {
      const bucket = landStep > 0 ? Math.min(Math.floor((val - actualLandMin) / landStep), 4) : 0;
      landDistribution[bucket]++;
    });
    const landChartData = landDistribution.map((count, i) => ({
      range: `$${((actualLandMin + i * landStep) / 1000).toFixed(0)}k - $${((actualLandMin + (i + 1) * landStep) / 1000).toFixed(0)}k`,
      count,
      binMin: Math.round(actualLandMin + i * landStep),
      binMax: Math.round(actualLandMin + (i + 1) * landStep),
    }));

    // Improvement value histogram
    const improvementValues = properties.map(p => p.improvementValue || 0);
    const actualImpMin = improvementValues.length > 0 ? Math.min(...improvementValues) : 0;
    const actualImpMax = improvementValues.length > 0 ? Math.max(...improvementValues) : 1;
    const improvementDistribution = [0, 0, 0, 0, 0];
    const impStep = (actualImpMax - actualImpMin) / 5;
    improvementValues.forEach(val => {
      const bucket = impStep > 0 ? Math.min(Math.floor((val - actualImpMin) / impStep), 4) : 0;
      improvementDistribution[bucket]++;
    });
    const improvementChartData = improvementDistribution.map((count, i) => ({
      range: `$${((actualImpMin + i * impStep) / 1000).toFixed(0)}k - $${((actualImpMin + (i + 1) * impStep) / 1000).toFixed(0)}k`,
      count,
      binMin: Math.round(actualImpMin + i * impStep),
      binMax: Math.round(actualImpMin + (i + 1) * impStep),
    }));

    // Calculate total taxes using per-parcel mill levy (excluding EXEMPT properties)
    // Formula: (Total Taxable × Mill Levy) - (HH Exemption × Mill Levy) - (Vet Exemption × Mill Levy)
    const totalTaxes = properties.reduce((sum, p) => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExemptValue = p.hhExemption || 0;
      const vetExemptValue = p.vetExemption || 0;
      const parcelMillLevy = p.millLevy || 28.714;
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount) return sum; // EXEMPT properties pay $0 tax
      
      const grossTax = (totalTaxable * parcelMillLevy) / 1000;
      const hhExemptionAmount = (hhExemptValue * parcelMillLevy) / 1000;
      const vetExemptionAmount = (vetExemptValue * parcelMillLevy) / 1000;
      
      return sum + Math.max(0, grossTax - hhExemptionAmount - vetExemptionAmount);
    }, 0);
    const avgTaxes = properties.length > 0 ? totalTaxes / properties.length : 0;
    const taxPctOfTotal = totalValue > 0 ? (totalTaxes / totalValue) * 100 : 0;
    const taxPctOfAvg = avgValue > 0 ? (avgTaxes / avgValue) * 100 : 0;

    // Count properties with HH exemption and calculate total tax savings
    const hhExemptionCount = properties.filter(p => (p.hhExemption || 0) > 0).length;
    const totalHhExemption = properties.reduce((sum, p) => {
      const parcelMillLevy = p.millLevy || 28.714;
      return sum + ((p.hhExemption || 0) * parcelMillLevy) / 1000;
    }, 0);
    
    // Count properties with Vet exemption and calculate total tax savings
    const vetExemptionCount = properties.filter(p => (p.vetExemption || 0) > 0).length;
    const totalVetExemption = properties.reduce((sum, p) => {
      const parcelMillLevy = p.millLevy || 28.714;
      return sum + ((p.vetExemption || 0) * parcelMillLevy) / 1000;
    }, 0);
    
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
    
    // Build exemptions chart data (all values now in tax dollars)
    const exemptionsChartData = [
      { type: "HH Exemption", value: totalHhExemption, count: hhExemptionCount },
      { type: "Vet Exemption", value: totalVetExemption, count: vetExemptionCount },
      ...Object.entries(exemptAccountExemptions).map(([type, value]) => ({
        type,
        value,
        count: properties.filter(p => p.accountType === type).length,
      })),
    ].filter(d => d.value > 0);
    
    // Total tax exemptions (sum of all exemption values - all in tax dollars)
    const totalExemptAccountValue = Object.values(exemptAccountExemptions).reduce((sum, v) => sum + v, 0);
    const totalTaxExemptions = totalHhExemption + totalVetExemption + totalExemptAccountValue;

    // Aggregate account types
    const accountTypeCounts: Record<string, number> = {};
    properties.forEach(p => {
      const acctType = p.accountType || "Unknown";
      accountTypeCounts[acctType] = (accountTypeCounts[acctType] || 0) + 1;
    });
    
    // Build account types chart data (sorted by count descending)
    const accountTypesChartData = Object.entries(accountTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 account types

    // Count properties with no improvement value (land only)
    const landOnlyProps = properties.filter(p => (p.improvementValue || 0) === 0);
    const noImprovementCount = landOnlyProps.length;
    const totalLandOnlyAcres = landOnlyProps.reduce((sum, p) => sum + (p.parcelArea || 0), 0);

    // Top land holders - aggregate parcel area (acres) by owner
    const landByOwner: Record<string, { totalAcres: number; propertyCount: number }> = {};
    properties.forEach(p => {
      const owner = p.owner || "Unknown";
      if (!landByOwner[owner]) {
        landByOwner[owner] = { totalAcres: 0, propertyCount: 0 };
      }
      landByOwner[owner].totalAcres += p.parcelArea || 0;
      landByOwner[owner].propertyCount += 1;
    });
    
    const topLandHoldersData = Object.entries(landByOwner)
      .map(([owner, data]) => ({
        owner: owner.length > 25 ? owner.substring(0, 22) + "..." : owner,
        fullOwner: owner,
        totalAcres: data.totalAcres,
        propertyCount: data.propertyCount,
      }))
      .sort((a, b) => b.totalAcres - a.totalAcres)
      .slice(0, 10);

    // Total parcel area (acres)
    const totalParcelAcres = properties.reduce((sum, p) => sum + (p.parcelArea || 0), 0);
    const avgParcelAcres = properties.length > 0 ? totalParcelAcres / properties.length : 0;
    
    // Total land value and avg per acre
    const totalLandValue = properties.reduce((sum, p) => sum + (p.landValue || 0), 0);
    const avgLandValuePerAcre = totalParcelAcres > 0 ? totalLandValue / totalParcelAcres : 0;

    return {
      totalValue,
      avgValue,
      count: properties.length,
      chartData,
      minAssessedValue: minVal,
      maxAssessedValue: maxVal,
      minTaxValue: actualTaxMin,
      maxTaxValue: actualTaxMax,
      minLandValue: actualLandMin,
      maxLandValue: actualLandMax,
      minImprovementValue: actualImpMin,
      maxImprovementValue: actualImpMax,
      minParcelArea: actualParcelMin,
      maxParcelArea: actualParcelMax,
      totalTaxes,
      avgTaxes,
      taxPctOfTotal,
      taxPctOfAvg,
      hhExemptionCount,
      totalHhExemption,
      noImprovementCount,
      totalLandOnlyAcres,
      totalParcelAcres,
      avgParcelAcres,
      totalLandValue,
      avgLandValuePerAcre,
      exemptionsChartData,
      totalTaxExemptions,
      accountTypesChartData,
      taxChartData,
      parcelChartData,
      landChartData,
      improvementChartData,
      topLandHoldersData,
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
  // Formula: (Total Taxable × Mill Levy) - (HH Exemption × Mill Levy) - (Vet Exemption × Mill Levy)
  const calculatePropertyTax = (property: PropertyResponse) => {
    const totalTaxable = property.totalTaxable || 0;
    const hhExemptValue = property.hhExemption || 0;
    const vetExemptValue = property.vetExemption || 0;
    const millLevy = property.millLevy || 28.714;
    const isExemptAccount = property.accountType?.toUpperCase().includes("EXEMPT") || false;
    if (isExemptAccount) return 0;
    
    const grossTax = (totalTaxable * millLevy) / 1000;
    const hhExemptionAmount = (hhExemptValue * millLevy) / 1000;
    const vetExemptionAmount = (vetExemptValue * millLevy) / 1000;
    
    return Math.max(0, grossTax - hhExemptionAmount - vetExemptionAmount);
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
        parcelAreaAcres: p.parcelArea,
        buildingSqft: p.buildingSqft,
        millLevy: p.millLevy,
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
        "Parcel Area (acres)",
        "Building Sqft",
        "Mill Levy",
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
        p.parcelArea?.toFixed(4) || "",
        p.buildingSqft || 0,
        p.millLevy || "",
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
      <div 
        className={`z-20 flex flex-col h-full bg-card/95 backdrop-blur-md border-r border-border shadow-2xl shrink-0 overflow-y-auto transition-all duration-300 ${
          sidebarCollapsed ? "w-14" : "w-full md:w-[400px]"
        }`}
      >
        {/* Collapse Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute top-4 right-4 z-30 md:relative md:top-0 md:right-0 md:self-end md:m-2"
          data-testid="button-toggle-sidebar"
        >
          {sidebarCollapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>

        {!sidebarCollapsed && (
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
              Interactive land value assessment map and analytics platform.
            </p>
          </div>

          {/* Filters Section - Collapsible */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors" data-testid="button-toggle-filters">
                  <Filter className="w-4 h-4" />
                  <span>Filters</span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <button
                  onClick={() => {
                    setYear(2025);
                    setValueRange([0, 5000000]);
                    setTaxRange([0, 50000]);
                    setParcelAreaRange([0, 100]);
                    setLandValueRange([0, 2000000]);
                    setImprovementValueRange([0, 5000000]);
                    setSelectedAccountTypes([]);
                    setOwnerFilter("");
                    setUseRegex(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-primary"
                  data-testid="button-reset-all-filters"
                >
                  Reset All
                </button>
              </div>

              <CollapsibleContent className="pt-4">
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
                        {formatCurrencyShort(stats?.minAssessedValue ?? valueRange[0])}
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
                        {(stats?.maxAssessedValue ?? valueRange[1]) >= 5000000
                          ? "5M+"
                          : formatCurrencyShort(stats?.maxAssessedValue ?? valueRange[1])}
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
                {stats?.chartData && (
                  <div className="h-20 mt-2">
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
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setValueRange([data.binMin, Math.min(data.binMax, 5000000)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Land Value Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Land Value
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingLandValueMin ? (
                      <input
                        ref={landValueMinInputRef}
                        type="text"
                        value={tempLandValueMin}
                        onChange={(e) => setTempLandValueMin(e.target.value)}
                        onBlur={handleLandValueMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLandValueMinSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-teal-500 text-teal-500 rounded text-right"
                        data-testid="input-land-value-min"
                      />
                    ) : (
                      <button
                        onClick={handleLandValueMinClick}
                        className="text-teal-500 hover:underline cursor-pointer"
                        data-testid="button-edit-land-value-min"
                      >
                        {formatCurrencyShort(stats?.minLandValue ?? landValueRange[0])}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingLandValueMax ? (
                      <input
                        ref={landValueMaxInputRef}
                        type="text"
                        value={tempLandValueMax}
                        onChange={(e) => setTempLandValueMax(e.target.value)}
                        onBlur={handleLandValueMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLandValueMaxSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-teal-500 text-teal-500 rounded text-right"
                        data-testid="input-land-value-max"
                      />
                    ) : (
                      <button
                        onClick={handleLandValueMaxClick}
                        className="text-teal-500 hover:underline cursor-pointer"
                        data-testid="button-edit-land-value-max"
                      >
                        {(stats?.maxLandValue ?? landValueRange[1]) >= 2000000
                          ? "$2M+"
                          : formatCurrencyShort(stats?.maxLandValue ?? landValueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  defaultValue={[0, 2000000]}
                  max={2000000}
                  step={10000}
                  value={landValueRange}
                  onValueChange={(val) =>
                    setLandValueRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-teal-500"
                  thumbClassName="border-teal-500"
                  data-testid="slider-land-value"
                />
                {stats?.landChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.landChartData}>
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
                          fill="hsl(173 80% 40%)"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(data) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setLandValueRange([data.binMin, Math.min(data.binMax, 2000000)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Improvement Value Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Improvement Value
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingImprovementMin ? (
                      <input
                        ref={improvementMinInputRef}
                        type="text"
                        value={tempImprovementMin}
                        onChange={(e) => setTempImprovementMin(e.target.value)}
                        onBlur={handleImprovementMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleImprovementMinSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-orange-500 text-orange-500 rounded text-right"
                        data-testid="input-improvement-min"
                      />
                    ) : (
                      <button
                        onClick={handleImprovementMinClick}
                        className="text-orange-500 hover:underline cursor-pointer"
                        data-testid="button-edit-improvement-min"
                      >
                        {formatCurrencyShort(stats?.minImprovementValue ?? improvementValueRange[0])}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingImprovementMax ? (
                      <input
                        ref={improvementMaxInputRef}
                        type="text"
                        value={tempImprovementMax}
                        onChange={(e) => setTempImprovementMax(e.target.value)}
                        onBlur={handleImprovementMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleImprovementMaxSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-orange-500 text-orange-500 rounded text-right"
                        data-testid="input-improvement-max"
                      />
                    ) : (
                      <button
                        onClick={handleImprovementMaxClick}
                        className="text-orange-500 hover:underline cursor-pointer"
                        data-testid="button-edit-improvement-max"
                      >
                        {(stats?.maxImprovementValue ?? improvementValueRange[1]) >= 5000000
                          ? "$5M+"
                          : formatCurrencyShort(stats?.maxImprovementValue ?? improvementValueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  defaultValue={[0, 5000000]}
                  max={5000000}
                  step={50000}
                  value={improvementValueRange}
                  onValueChange={(val) =>
                    setImprovementValueRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-orange-500"
                  thumbClassName="border-orange-500"
                  data-testid="slider-improvement-value"
                />
                {stats?.improvementChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.improvementChartData}>
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
                          fill="hsl(24 95% 50%)"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(data) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setImprovementValueRange([data.binMin, Math.min(data.binMax, 5000000)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Tax Assessed
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
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-green-500 text-green-500 rounded text-right"
                        data-testid="input-tax-min"
                      />
                    ) : (
                      <button
                        onClick={handleTaxMinClick}
                        className="text-green-500 hover:underline cursor-pointer"
                        data-testid="button-edit-tax-min"
                      >
                        {formatCurrencyShort(stats?.minTaxValue ?? taxRange[0])}
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
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-green-500 text-green-500 rounded text-right"
                        data-testid="input-tax-max"
                      />
                    ) : (
                      <button
                        onClick={handleTaxMaxClick}
                        className="text-green-500 hover:underline cursor-pointer"
                        data-testid="button-edit-tax-max"
                      >
                        {(stats?.maxTaxValue ?? taxRange[1]) >= 50000
                          ? "$50k+"
                          : formatCurrencyShort(stats?.maxTaxValue ?? taxRange[1])}
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
                  rangeClassName="bg-green-500"
                  thumbClassName="border-green-500"
                  data-testid="slider-tax-range"
                />
                {stats?.taxChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.taxChartData}>
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
                          fill="hsl(142 71% 45%)"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(data) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setTaxRange([data.binMin, Math.min(data.binMax, 50000)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Parcel Area Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Parcel Area (Acres)
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingParcelMin ? (
                      <input
                        ref={parcelMinInputRef}
                        type="text"
                        value={tempParcelMin}
                        onChange={(e) => setTempParcelMin(e.target.value)}
                        onBlur={handleParcelMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleParcelMinSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-purple-500 text-purple-500 rounded text-right"
                        data-testid="input-parcel-min"
                      />
                    ) : (
                      <button
                        onClick={handleParcelMinClick}
                        className="text-purple-500 hover:underline cursor-pointer"
                        data-testid="button-edit-parcel-min"
                      >
                        {(stats?.minParcelArea ?? parcelAreaRange[0]).toFixed(1)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingParcelMax ? (
                      <input
                        ref={parcelMaxInputRef}
                        type="text"
                        value={tempParcelMax}
                        onChange={(e) => setTempParcelMax(e.target.value)}
                        onBlur={handleParcelMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleParcelMaxSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-purple-500 text-purple-500 rounded text-right"
                        data-testid="input-parcel-max"
                      />
                    ) : (
                      <button
                        onClick={handleParcelMaxClick}
                        className="text-purple-500 hover:underline cursor-pointer"
                        data-testid="button-edit-parcel-max"
                      >
                        {(stats?.maxParcelArea ?? parcelAreaRange[1]) >= 100 
                          ? "100+" 
                          : (stats?.maxParcelArea ?? parcelAreaRange[1]).toFixed(1)}
                      </button>
                    )}
                    <span className="text-muted-foreground text-[10px]">ac</span>
                  </div>
                </div>
                <Slider
                  defaultValue={[0, 100]}
                  max={100}
                  step={0.1}
                  value={parcelAreaRange}
                  onValueChange={(val) =>
                    setParcelAreaRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-purple-500"
                  thumbClassName="border-purple-500"
                  data-testid="slider-parcel-area"
                />
                {stats?.parcelChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.parcelChartData}>
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
                          fill="hsl(271 81% 56%)"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(data) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setParcelAreaRange([data.binMin, Math.min(data.binMax, 100)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Account Type Multi-Select */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Account Type
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedAccountTypes([...uniqueAccountTypes])}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-all-account-types"
                    >
                      All
                    </button>
                    <button
                      onClick={() => setSelectedAccountTypes([])}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-none-account-types"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-background/50 rounded-md border border-border p-2 space-y-1">
                  {uniqueAccountTypes.map((type) => {
                    const isSelected = selectedAccountTypes.includes(type);
                    const count = propertiesWithoutAccountTypeFilter.filter((p) => p.accountType === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() =>
                          setSelectedAccountTypes((prev) =>
                            isSelected
                              ? prev.filter((t) => t !== type)
                              : [...prev, type]
                          )
                        }
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-account-type-${type.replace(/\s+/g, '-').toLowerCase()}`}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-muted-foreground"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <span className="truncate">{type}</span>
                        </div>
                        <span className="text-muted-foreground ml-2">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedAccountTypes.length === 0
                    ? "All types shown"
                    : `${selectedAccountTypes.length} type${selectedAccountTypes.length > 1 ? "s" : ""} selected`}
                </p>
              </div>

              {/* Owner Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Owner
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUseRegex(false)}
                      className={`text-xs px-2 py-0.5 rounded ${!useRegex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}
                      data-testid="button-owner-literal"
                    >
                      Literal
                    </button>
                    <button
                      onClick={() => setUseRegex(true)}
                      className={`text-xs px-2 py-0.5 rounded ${useRegex ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-primary'}`}
                      data-testid="button-owner-regex"
                    >
                      Regex
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  placeholder={useRegex ? "e.g. ^SMITH|JONES$" : "Search by owner name..."}
                  className="w-full px-3 py-2 text-sm bg-background/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="input-owner-filter"
                />
                {ownerFilter && (
                  <p className="text-xs text-muted-foreground">
                    {useRegex ? "Using regex pattern (case-insensitive)" : "Using literal string match"}
                  </p>
                )}
              </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Export Data Section */}
          <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </div>
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

          {/* Stats Section - Collapsible */}
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-primary hover:text-primary/80 transition-colors" data-testid="button-toggle-stats">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Statistics</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4">
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
                title="Total Parcel Area"
                value={`${stats.totalParcelAcres.toLocaleString(undefined, {maximumFractionDigits: 0})} ac`}
                icon={TrendingUp}
                description={`Avg: ${stats.avgParcelAcres.toFixed(2)} acres`}
              />
              <StatsCard
                title="Total Land Value"
                value={formatCurrencyShort(stats.totalLandValue)}
                icon={DollarSign}
                description={`Avg: $${stats.avgLandValuePerAcre.toLocaleString(undefined, {maximumFractionDigits: 0})}/acre`}
              />
              <StatsCard
                title="Total Tax Assessed"
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
              </div>

              {/* Account Types Chart */}
              {stats.accountTypesChartData && stats.accountTypesChartData.length > 0 && (
                <div className="h-64 pt-4">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                    Properties by Account Type
                  </label>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={stats.accountTypesChartData} 
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="type" 
                        width={100}
                        tick={{ fontSize: 10, fill: "hsl(215 20% 65%)" }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(222 47% 11%)",
                          borderColor: "hsl(217 33% 17%)",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "white" }}
                        formatter={(value: number) => [value.toLocaleString(), "Properties"]}
                        labelFormatter={(label) => label}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="hsl(271 81% 56%)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

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

              {/* Top Land Holders Chart */}
              {stats.topLandHoldersData && stats.topLandHoldersData.length > 0 && (
                <div className="h-72 pt-4">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                    Top Land Holders (Acres)
                  </label>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={stats.topLandHoldersData} 
                      layout="vertical"
                      margin={{ left: 10, right: 10 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis 
                        type="category" 
                        dataKey="owner" 
                        width={140}
                        tick={{ fontSize: 9, fill: "hsl(215 20% 65%)" }}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "hsl(222 47% 11%)",
                          borderColor: "hsl(217 33% 17%)",
                          borderRadius: "8px",
                        }}
                        itemStyle={{ color: "white" }}
                        formatter={(value: number, name: string, props: any) => {
                          if (name === "totalAcres") {
                            const count = props.payload.propertyCount;
                            return [`${value.toFixed(2)} acres (${count} properties)`, "Total Land"];
                          }
                          return [value, name];
                        }}
                        labelFormatter={(label, payload) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.fullOwner;
                          }
                          return label;
                        }}
                        cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      />
                      <Bar
                        dataKey="totalAcres"
                        fill="hsl(280 65% 60%)"
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
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
        )}

        {/* Footer */}
        {!sidebarCollapsed && (
        <div className="mt-auto p-6 border-t border-border text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Los Alamos Assessment Viz.</p>
          <p className="mt-1">Data provided by County Assessor.</p>
        </div>
        )}
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
            <MapResizeHandler collapsed={sidebarCollapsed} />
            <TileLayer
              key={mapLayer}
              attribution={TILE_LAYERS[mapLayer].attribution}
              url={TILE_LAYERS[mapLayer].url}
            />

            {properties && <ClusterLayer points={properties} />}
          </MapContainer>
        </div>

        {/* Map Layer Switcher */}
        <div className="absolute top-4 right-4 z-[400] bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-1 flex gap-1">
          <button
            onClick={() => setMapLayer("street")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              mapLayer === "street"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            data-testid="button-map-street"
          >
            Street
          </button>
          <button
            onClick={() => setMapLayer("satellite")}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              mapLayer === "satellite"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
            data-testid="button-map-satellite"
          >
            Satellite
          </button>
        </div>
      </div>
    </div>
  );
}
