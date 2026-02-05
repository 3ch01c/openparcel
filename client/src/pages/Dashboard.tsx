import { useState, useMemo, useRef, useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { ClusterLayer, PolygonLayer, type MapViewMode } from "@/components/MapController";
import { type ColorMetric, COLOR_METRIC_LABELS } from "@/lib/map-metrics";
import type { PropertyResponse } from "@shared/schema";
import { StatsCard } from "@/components/StatsCard";
import { RangeFilter } from "@/components/RangeFilter";
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
  Upload,
  Coffee,
  ChevronDown,
  BarChart3,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  Droplets,
  Zap,
  Flame,
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
  const [mapViewMode, setMapViewMode] = useState<MapViewMode>("cluster");
  const [colorMetric, setColorMetric] = useState<ColorMetric>("bldgLandRatio");
  const [valueRange, setValueRange] = useState<[number, number]>([0, 250000000]);
  const [taxRange, setTaxRange] = useState<[number, number]>([0, 500000]);
  const [parcelAreaRange, setParcelAreaRange] = useState<[number, number]>([0, 1200]);
  const [landValueRange, setLandValueRange] = useState<[number, number]>([0, 250000000]);
  const [improvementValueRange, setImprovementValueRange] = useState<[number, number]>([0, 50000000]);
  const [landValuePerSqftRange, setLandValuePerSqftRange] = useState<[number, number]>([0, 150]);
  const [bldgToLandRatioRange, setBldgToLandRatioRange] = useState<[number, number]>([0, 2]);
  const [waterUsageRange, setWaterUsageRange] = useState<[number, number]>([0, 100]);
  const [electricUsageRange, setElectricUsageRange] = useState<[number, number]>([0, 5000]);
  const [gasUsageRange, setGasUsageRange] = useState<[number, number]>([0, 500]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
  const [editingLandPerSqftMin, setEditingLandPerSqftMin] = useState(false);
  const [editingLandPerSqftMax, setEditingLandPerSqftMax] = useState(false);
  const [tempLandPerSqftMin, setTempLandPerSqftMin] = useState("");
  const [tempLandPerSqftMax, setTempLandPerSqftMax] = useState("");
  const [editingBldgRatioMin, setEditingBldgRatioMin] = useState(false);
  const [editingBldgRatioMax, setEditingBldgRatioMax] = useState(false);
  const [tempBldgRatioMin, setTempBldgRatioMin] = useState("");
  const [tempBldgRatioMax, setTempBldgRatioMax] = useState("");
  const [editingWaterMin, setEditingWaterMin] = useState(false);
  const [editingWaterMax, setEditingWaterMax] = useState(false);
  const [tempWaterMin, setTempWaterMin] = useState("");
  const [tempWaterMax, setTempWaterMax] = useState("");
  const [editingElectricMin, setEditingElectricMin] = useState(false);
  const [editingElectricMax, setEditingElectricMax] = useState(false);
  const [tempElectricMin, setTempElectricMin] = useState("");
  const [tempElectricMax, setTempElectricMax] = useState("");
  const [editingGasMin, setEditingGasMin] = useState(false);
  const [editingGasMax, setEditingGasMax] = useState(false);
  const [tempGasMin, setTempGasMin] = useState("");
  const [tempGasMax, setTempGasMax] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([]);
  const [selectedSubdivisions, setSelectedSubdivisions] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedOwnerCityStates, setSelectedOwnerCityStates] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [pendingOwnerFilter, setPendingOwnerFilter] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const rangesInitialized = useRef(false);
  const pendingRangeUpdateRef = useRef(false); // Flag to trigger range update after user applies categorical filter
  const initialTotalParcelsRef = useRef<number | null>(null);
  const initialAccountTypesRef = useRef<string[] | null>(null);
  const initialSubdivisionsRef = useRef<string[] | null>(null);
  const initialZonesRef = useRef<string[] | null>(null);
  const initialOwnerCityStatesRef = useRef<string[] | null>(null);
  const initialBoundsRef = useRef<{
    assessedValue: { min: number; max: number };
    tax: { min: number; max: number };
    parcelArea: { min: number; max: number };
    landValue: { min: number; max: number };
    improvementValue: { min: number; max: number };
    landPerSqft: { min: number; max: number };
    bldgRatio: { min: number; max: number };
    waterUsage: { min: number; max: number };
    electricUsage: { min: number; max: number };
    gasUsage: { min: number; max: number };
  } | null>(null);
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
  const landPerSqftMinInputRef = useRef<HTMLInputElement>(null);
  const landPerSqftMaxInputRef = useRef<HTMLInputElement>(null);
  const bldgRatioMinInputRef = useRef<HTMLInputElement>(null);
  const bldgRatioMaxInputRef = useRef<HTMLInputElement>(null);
  const waterMinInputRef = useRef<HTMLInputElement>(null);
  const waterMaxInputRef = useRef<HTMLInputElement>(null);
  const electricMinInputRef = useRef<HTMLInputElement>(null);
  const electricMaxInputRef = useRef<HTMLInputElement>(null);
  const gasMinInputRef = useRef<HTMLInputElement>(null);
  const gasMaxInputRef = useRef<HTMLInputElement>(null);

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

  // Land Value Per Sqft handlers
  const handleLandPerSqftMinClick = () => {
    setTempLandPerSqftMin(String(landValuePerSqftRange[0]));
    setEditingLandPerSqftMin(true);
    setTimeout(() => landPerSqftMinInputRef.current?.select(), 0);
  };

  const handleLandPerSqftMaxClick = () => {
    setTempLandPerSqftMax(landValuePerSqftRange[1] >= 100 ? "100" : String(landValuePerSqftRange[1]));
    setEditingLandPerSqftMax(true);
    setTimeout(() => landPerSqftMaxInputRef.current?.select(), 0);
  };

  const handleLandPerSqftMinSubmit = () => {
    const val = parseFloat(tempLandPerSqftMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, landValuePerSqftRange[1]));
      setLandValuePerSqftRange([clamped, landValuePerSqftRange[1]]);
    }
    setEditingLandPerSqftMin(false);
  };

  const handleLandPerSqftMaxSubmit = () => {
    const val = parseFloat(tempLandPerSqftMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(landValuePerSqftRange[0], Math.min(val, 100));
      setLandValuePerSqftRange([landValuePerSqftRange[0], clamped]);
    }
    setEditingLandPerSqftMax(false);
  };

  // Building Sqft to Land Sqft Ratio handlers
  const handleBldgRatioMinClick = () => {
    setTempBldgRatioMin(String(bldgToLandRatioRange[0]));
    setEditingBldgRatioMin(true);
    setTimeout(() => bldgRatioMinInputRef.current?.select(), 0);
  };

  const handleBldgRatioMaxClick = () => {
    setTempBldgRatioMax(bldgToLandRatioRange[1] >= 2 ? "2" : String(bldgToLandRatioRange[1]));
    setEditingBldgRatioMax(true);
    setTimeout(() => bldgRatioMaxInputRef.current?.select(), 0);
  };

  const handleBldgRatioMinSubmit = () => {
    const val = parseFloat(tempBldgRatioMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, bldgToLandRatioRange[1]));
      setBldgToLandRatioRange([clamped, bldgToLandRatioRange[1]]);
    }
    setEditingBldgRatioMin(false);
  };

  const handleBldgRatioMaxSubmit = () => {
    const val = parseFloat(tempBldgRatioMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(bldgToLandRatioRange[0], Math.min(val, 2));
      setBldgToLandRatioRange([bldgToLandRatioRange[0], clamped]);
    }
    setEditingBldgRatioMax(false);
  };

  // Water Usage handlers
  const handleWaterMinClick = () => {
    setTempWaterMin(String(waterUsageRange[0]));
    setEditingWaterMin(true);
    setTimeout(() => waterMinInputRef.current?.select(), 0);
  };

  const handleWaterMaxClick = () => {
    setTempWaterMax(String(waterUsageRange[1]));
    setEditingWaterMax(true);
    setTimeout(() => waterMaxInputRef.current?.select(), 0);
  };

  const handleWaterMinSubmit = () => {
    const val = parseFloat(tempWaterMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, waterUsageRange[1]));
      setWaterUsageRange([clamped, waterUsageRange[1]]);
    }
    setEditingWaterMin(false);
  };

  const handleWaterMaxSubmit = () => {
    const val = parseFloat(tempWaterMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(waterUsageRange[0], val);
      setWaterUsageRange([waterUsageRange[0], clamped]);
    }
    setEditingWaterMax(false);
  };

  // Electric Usage handlers
  const handleElectricMinClick = () => {
    setTempElectricMin(String(electricUsageRange[0]));
    setEditingElectricMin(true);
    setTimeout(() => electricMinInputRef.current?.select(), 0);
  };

  const handleElectricMaxClick = () => {
    setTempElectricMax(String(electricUsageRange[1]));
    setEditingElectricMax(true);
    setTimeout(() => electricMaxInputRef.current?.select(), 0);
  };

  const handleElectricMinSubmit = () => {
    const val = parseFloat(tempElectricMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, electricUsageRange[1]));
      setElectricUsageRange([clamped, electricUsageRange[1]]);
    }
    setEditingElectricMin(false);
  };

  const handleElectricMaxSubmit = () => {
    const val = parseFloat(tempElectricMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(electricUsageRange[0], val);
      setElectricUsageRange([electricUsageRange[0], clamped]);
    }
    setEditingElectricMax(false);
  };

  // Gas Usage handlers
  const handleGasMinClick = () => {
    setTempGasMin(String(gasUsageRange[0]));
    setEditingGasMin(true);
    setTimeout(() => gasMinInputRef.current?.select(), 0);
  };

  const handleGasMaxClick = () => {
    setTempGasMax(String(gasUsageRange[1]));
    setEditingGasMax(true);
    setTimeout(() => gasMaxInputRef.current?.select(), 0);
  };

  const handleGasMinSubmit = () => {
    const val = parseFloat(tempGasMin.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(0, Math.min(val, gasUsageRange[1]));
      setGasUsageRange([clamped, gasUsageRange[1]]);
    }
    setEditingGasMin(false);
  };

  const handleGasMaxSubmit = () => {
    const val = parseFloat(tempGasMax.replace(/[^0-9.]/g, ""));
    if (!isNaN(val)) {
      const clamped = Math.max(gasUsageRange[0], val);
      setGasUsageRange([gasUsageRange[0], clamped]);
    }
    setEditingGasMax(false);
  };

  // Calculate land value per sqft for a property
  const getLandValuePerSqft = (p: PropertyResponse) => {
    const landValue = p.landValue || 0;
    const landSqft = p.landSqft || (p.parcelArea || 0) * 43560;
    return landSqft > 0 ? landValue / landSqft : 0;
  };

  // Calculate building sqft to land sqft ratio
  const getBldgToLandRatio = (p: PropertyResponse) => {
    const bldgSqft = p.buildingSqft || 0;
    const landSqft = p.landSqft || (p.parcelArea || 0) * 43560;
    return landSqft > 0 ? bldgSqft / landSqft : 0;
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
    refetch,
  } = useProperties({
    year,
    minValue: valueRange[0],
    maxValue: valueRange[1],
  });

  // Get unique account types from initial data load (never changes after first load)
  const uniqueAccountTypes = initialAccountTypesRef.current || [];

  // Get unique subdivisions from initial data load (never changes after first load)
  const uniqueSubdivisions = initialSubdivisionsRef.current || [];

  // Get unique zones from initial data load (never changes after first load)
  const uniqueZones = initialZonesRef.current || [];

  // Get unique owner city/state combinations from initial data load (never changes after first load)
  const uniqueOwnerCityStates = initialOwnerCityStatesRef.current || [];

  // Calculate unfiltered data ranges for initial slider bounds and reset
  const unfilteredRanges = useMemo(() => {
    if (!rawProperties || rawProperties.length === 0) {
      return {
        assessedValue: { min: 0, max: 250000000 },
        tax: { min: 0, max: 500000 },
        parcelArea: { min: 0, max: 1200 },
        landValue: { min: 0, max: 250000000 },
        improvementValue: { min: 0, max: 50000000 },
        landPerSqft: { min: 0, max: 150 },
        bldgRatio: { min: 0, max: 2 },
        waterUsage: { min: 0, max: 100 },
        electricUsage: { min: 0, max: 5000 },
        gasUsage: { min: 0, max: 500 },
      };
    }

    // Calculate tax values
    const taxValues = rawProperties.map(p => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExempt = p.hhExemption || 0;
      const vetExempt = p.vetExemption || 0;
      const parcelMillLevy = p.millLevy || 28.714;
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount) return 0;
      return Math.max(0, totalTaxable - hhExempt - vetExempt) * parcelMillLevy / 1000;
    });

    // Calculate land per sqft values
    const landPerSqftValues = rawProperties.map(p => getLandValuePerSqft(p));

    // Calculate bldg ratio values
    const bldgRatioValues = rawProperties.map(p => getBldgToLandRatio(p));

    return {
      assessedValue: {
        min: Math.min(...rawProperties.map(p => p.assessedValue)),
        max: Math.max(...rawProperties.map(p => p.assessedValue)),
      },
      tax: {
        min: Math.min(...taxValues),
        max: Math.max(...taxValues),
      },
      parcelArea: {
        min: Math.min(...rawProperties.map(p => p.parcelArea || 0)),
        max: Math.max(...rawProperties.map(p => p.parcelArea || 0)),
      },
      landValue: {
        min: Math.min(...rawProperties.map(p => p.landValue || 0)),
        max: Math.max(...rawProperties.map(p => p.landValue || 0)),
      },
      improvementValue: {
        min: Math.min(...rawProperties.map(p => p.improvementValue || 0)),
        max: Math.max(...rawProperties.map(p => p.improvementValue || 0)),
      },
      landPerSqft: {
        min: Math.min(...landPerSqftValues),
        max: Math.max(...landPerSqftValues),
      },
      bldgRatio: {
        min: Math.min(...bldgRatioValues),
        max: Math.max(...bldgRatioValues),
      },
      waterUsage: {
        min: Math.min(...rawProperties.map(p => p.avgMonthlyWaterKgal || 0)),
        max: Math.max(...rawProperties.map(p => p.avgMonthlyWaterKgal || 0)),
      },
      electricUsage: {
        min: Math.min(...rawProperties.map(p => p.avgMonthlyElectricKwh || 0)),
        max: Math.max(...rawProperties.map(p => p.avgMonthlyElectricKwh || 0)),
      },
      gasUsage: {
        min: Math.min(...rawProperties.map(p => p.avgMonthlyGasTherms || 0)),
        max: Math.max(...rawProperties.map(p => p.avgMonthlyGasTherms || 0)),
      },
    };
  }, [rawProperties, getLandValuePerSqft, getBldgToLandRatio]);

  // Initialize filter ranges and store initial bounds when data first loads
  useEffect(() => {
    if (!rangesInitialized.current && rawProperties && rawProperties.length > 0) {
      // Store initial total parcel count - this will never change after first load
      initialTotalParcelsRef.current = rawProperties.length;
      // Store initial bounds permanently - these will never change after first load
      initialBoundsRef.current = {
        assessedValue: { min: unfilteredRanges.assessedValue.min, max: unfilteredRanges.assessedValue.max },
        tax: { min: unfilteredRanges.tax.min, max: unfilteredRanges.tax.max },
        parcelArea: { min: unfilteredRanges.parcelArea.min, max: unfilteredRanges.parcelArea.max },
        landValue: { min: unfilteredRanges.landValue.min, max: unfilteredRanges.landValue.max },
        improvementValue: { min: unfilteredRanges.improvementValue.min, max: unfilteredRanges.improvementValue.max },
        landPerSqft: { min: unfilteredRanges.landPerSqft.min, max: unfilteredRanges.landPerSqft.max },
        bldgRatio: { min: unfilteredRanges.bldgRatio.min, max: unfilteredRanges.bldgRatio.max },
        waterUsage: { min: unfilteredRanges.waterUsage.min, max: unfilteredRanges.waterUsage.max },
        electricUsage: { min: unfilteredRanges.electricUsage.min, max: unfilteredRanges.electricUsage.max },
        gasUsage: { min: unfilteredRanges.gasUsage.min, max: unfilteredRanges.gasUsage.max },
      };
      // Store initial multi-choice options permanently - these will never change after first load
      const accountTypes = new Set<string>();
      const subdivisions = new Set<string>();
      const zones = new Set<string>();
      const ownerCityStates = new Set<string>();
      rawProperties.forEach((p) => {
        if (p.accountType) accountTypes.add(p.accountType);
        if (p.subdiv) subdivisions.add(p.subdiv);
        if (p.zone) zones.add(p.zone);
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        if (city || state) {
          const combined = [city, state].filter(Boolean).join(", ");
          if (combined) ownerCityStates.add(combined);
        }
      });
      initialAccountTypesRef.current = Array.from(accountTypes).sort();
      initialSubdivisionsRef.current = Array.from(subdivisions).sort();
      initialZonesRef.current = Array.from(zones).sort();
      initialOwnerCityStatesRef.current = Array.from(ownerCityStates).sort();
      
      setValueRange([unfilteredRanges.assessedValue.min, unfilteredRanges.assessedValue.max]);
      setTaxRange([unfilteredRanges.tax.min, unfilteredRanges.tax.max]);
      setParcelAreaRange([unfilteredRanges.parcelArea.min, unfilteredRanges.parcelArea.max]);
      setLandValueRange([unfilteredRanges.landValue.min, unfilteredRanges.landValue.max]);
      setImprovementValueRange([unfilteredRanges.improvementValue.min, unfilteredRanges.improvementValue.max]);
      setLandValuePerSqftRange([unfilteredRanges.landPerSqft.min, unfilteredRanges.landPerSqft.max]);
      setBldgToLandRatioRange([unfilteredRanges.bldgRatio.min, unfilteredRanges.bldgRatio.max]);
      setWaterUsageRange([unfilteredRanges.waterUsage.min, unfilteredRanges.waterUsage.max]);
      setElectricUsageRange([unfilteredRanges.electricUsage.min, unfilteredRanges.electricUsage.max]);
      setGasUsageRange([unfilteredRanges.gasUsage.min, unfilteredRanges.gasUsage.max]);
      rangesInitialized.current = true;
    }
  }, [rawProperties, unfilteredRanges]);
  
  // Use initial bounds for sliders (falls back to unfilteredRanges if not yet initialized)
  const sliderBounds = initialBoundsRef.current || unfilteredRanges;

  // Filter properties by range filters (without account type filter)
  // Used to calculate account type counts based on current other filters
  const propertiesWithoutAccountTypeFilter = useMemo(() => {
    if (!rawProperties) return [];
    
    return rawProperties.filter((p) => {
      const tax = getPropertyTax(p);
      const parcelArea = p.parcelArea || 0;
      const landValue = p.landValue || 0;
      const improvementValue = p.improvementValue || 0;
      const landPerSqft = getLandValuePerSqft(p);
      const bldgRatio = getBldgToLandRatio(p);
      const waterUsage = p.avgMonthlyWaterKgal || 0;
      const electricUsage = p.avgMonthlyElectricKwh || 0;
      const gasUsage = p.avgMonthlyGasTherms || 0;
      
      return (
        tax >= taxRange[0] && tax <= taxRange[1] &&
        parcelArea >= parcelAreaRange[0] && parcelArea <= parcelAreaRange[1] &&
        landValue >= landValueRange[0] && landValue <= landValueRange[1] &&
        improvementValue >= improvementValueRange[0] && improvementValue <= improvementValueRange[1] &&
        landPerSqft >= landValuePerSqftRange[0] && landPerSqft <= landValuePerSqftRange[1] &&
        bldgRatio >= bldgToLandRatioRange[0] && bldgRatio <= bldgToLandRatioRange[1] &&
        waterUsage >= waterUsageRange[0] && waterUsage <= waterUsageRange[1] &&
        electricUsage >= electricUsageRange[0] && electricUsage <= electricUsageRange[1] &&
        gasUsage >= gasUsageRange[0] && gasUsage <= gasUsageRange[1]
      );
    });
  }, [rawProperties, taxRange, parcelAreaRange, landValueRange, improvementValueRange, landValuePerSqftRange, bldgToLandRatioRange, waterUsageRange, electricUsageRange, gasUsageRange]);

  // For account type counts: apply subdivision, zone, and owner city/state filters (but not account type)
  const propertiesForAccountTypeCounts = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    if (selectedSubdivisions.length > 0) {
      filtered = filtered.filter((p) =>
        p.subdiv && selectedSubdivisions.includes(p.subdiv)
      );
    }
    
    if (selectedZones.length > 0) {
      filtered = filtered.filter((p) =>
        p.zone && selectedZones.includes(p.zone)
      );
    }
    
    if (selectedOwnerCityStates.length > 0) {
      filtered = filtered.filter((p) => {
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        const combined = [city, state].filter(Boolean).join(", ");
        return combined && selectedOwnerCityStates.includes(combined);
      });
    }
    
    return filtered;
  }, [propertiesWithoutAccountTypeFilter, selectedSubdivisions, selectedZones, selectedOwnerCityStates]);

  // For subdivision counts: apply account type, zone, and owner city/state filters (but not subdivision)
  const propertiesForSubdivisionCounts = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((p) =>
        p.accountType && selectedAccountTypes.includes(p.accountType)
      );
    }
    
    if (selectedZones.length > 0) {
      filtered = filtered.filter((p) =>
        p.zone && selectedZones.includes(p.zone)
      );
    }
    
    if (selectedOwnerCityStates.length > 0) {
      filtered = filtered.filter((p) => {
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        const combined = [city, state].filter(Boolean).join(", ");
        return combined && selectedOwnerCityStates.includes(combined);
      });
    }
    
    return filtered;
  }, [propertiesWithoutAccountTypeFilter, selectedAccountTypes, selectedZones, selectedOwnerCityStates]);

  // For zone counts: apply account type, subdivision, and owner city/state filters (but not zone)
  const propertiesForZoneCounts = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((p) =>
        p.accountType && selectedAccountTypes.includes(p.accountType)
      );
    }
    
    if (selectedSubdivisions.length > 0) {
      filtered = filtered.filter((p) =>
        p.subdiv && selectedSubdivisions.includes(p.subdiv)
      );
    }
    
    if (selectedOwnerCityStates.length > 0) {
      filtered = filtered.filter((p) => {
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        const combined = [city, state].filter(Boolean).join(", ");
        return combined && selectedOwnerCityStates.includes(combined);
      });
    }
    
    return filtered;
  }, [propertiesWithoutAccountTypeFilter, selectedAccountTypes, selectedSubdivisions, selectedOwnerCityStates]);

  // For owner city/state counts: apply account type, subdivision, and zone filters (but not owner city/state)
  const propertiesForOwnerCityStateCounts = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((p) =>
        p.accountType && selectedAccountTypes.includes(p.accountType)
      );
    }
    
    if (selectedSubdivisions.length > 0) {
      filtered = filtered.filter((p) =>
        p.subdiv && selectedSubdivisions.includes(p.subdiv)
      );
    }
    
    if (selectedZones.length > 0) {
      filtered = filtered.filter((p) =>
        p.zone && selectedZones.includes(p.zone)
      );
    }
    
    return filtered;
  }, [propertiesWithoutAccountTypeFilter, selectedAccountTypes, selectedSubdivisions, selectedZones]);

  // Filter properties by tax range, land sqft, account types, and owner (client-side)
  const properties = useMemo(() => {
    let filtered = propertiesWithoutAccountTypeFilter;
    
    // Account type filter
    if (selectedAccountTypes.length > 0) {
      filtered = filtered.filter((p) =>
        p.accountType && selectedAccountTypes.includes(p.accountType)
      );
    }
    
    // Subdivision filter
    if (selectedSubdivisions.length > 0) {
      filtered = filtered.filter((p) =>
        p.subdiv && selectedSubdivisions.includes(p.subdiv)
      );
    }
    
    // Zone filter
    if (selectedZones.length > 0) {
      filtered = filtered.filter((p) =>
        p.zone && selectedZones.includes(p.zone)
      );
    }
    
    // Owner City/State filter
    if (selectedOwnerCityStates.length > 0) {
      filtered = filtered.filter((p) => {
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        const combined = [city, state].filter(Boolean).join(", ");
        return combined && selectedOwnerCityStates.includes(combined);
      });
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
  }, [propertiesWithoutAccountTypeFilter, selectedAccountTypes, selectedSubdivisions, selectedZones, selectedOwnerCityStates, ownerFilter, useRegex]);

  // Calculate filtered data ranges for dynamic slider bounds (from filtered properties)
  const filteredRanges = useMemo(() => {
    if (!properties || properties.length === 0) {
      return unfilteredRanges;
    }

    // Calculate tax values for filtered data
    const taxValues = properties.map(p => getPropertyTax(p));

    // Calculate land per sqft values for filtered data
    const landPerSqftValues = properties.map(p => getLandValuePerSqft(p));

    // Calculate bldg ratio values for filtered data
    const bldgRatioValues = properties.map(p => getBldgToLandRatio(p));

    return {
      assessedValue: {
        min: Math.min(...properties.map(p => p.assessedValue)),
        max: Math.max(...properties.map(p => p.assessedValue)),
      },
      tax: {
        min: Math.min(...taxValues),
        max: Math.max(...taxValues),
      },
      parcelArea: {
        min: Math.min(...properties.map(p => p.parcelArea || 0)),
        max: Math.max(...properties.map(p => p.parcelArea || 0)),
      },
      landValue: {
        min: Math.min(...properties.map(p => p.landValue || 0)),
        max: Math.max(...properties.map(p => p.landValue || 0)),
      },
      improvementValue: {
        min: Math.min(...properties.map(p => p.improvementValue || 0)),
        max: Math.max(...properties.map(p => p.improvementValue || 0)),
      },
      landPerSqft: {
        min: Math.min(...landPerSqftValues),
        max: Math.max(...landPerSqftValues),
      },
      bldgRatio: {
        min: Math.min(...bldgRatioValues),
        max: Math.max(...bldgRatioValues),
      },
    };
  }, [properties, unfilteredRanges, getPropertyTax, getLandValuePerSqft, getBldgToLandRatio]);

  // Clamp slider thumb values when they fall outside filtered data bounds
  useEffect(() => {
    if (!rangesInitialized.current || !properties || properties.length === 0) return;
    
    // Clamp assessed value range
    const clampedValueMin = Math.max(valueRange[0], filteredRanges.assessedValue.min);
    const clampedValueMax = Math.min(valueRange[1], filteredRanges.assessedValue.max);
    if (clampedValueMin !== valueRange[0] || clampedValueMax !== valueRange[1]) {
      setValueRange([clampedValueMin, clampedValueMax]);
    }
    
    // Clamp tax range
    const clampedTaxMin = Math.max(taxRange[0], filteredRanges.tax.min);
    const clampedTaxMax = Math.min(taxRange[1], filteredRanges.tax.max);
    if (clampedTaxMin !== taxRange[0] || clampedTaxMax !== taxRange[1]) {
      setTaxRange([clampedTaxMin, clampedTaxMax]);
    }
    
    // Clamp parcel area range
    const clampedParcelMin = Math.max(parcelAreaRange[0], filteredRanges.parcelArea.min);
    const clampedParcelMax = Math.min(parcelAreaRange[1], filteredRanges.parcelArea.max);
    if (clampedParcelMin !== parcelAreaRange[0] || clampedParcelMax !== parcelAreaRange[1]) {
      setParcelAreaRange([clampedParcelMin, clampedParcelMax]);
    }
    
    // Clamp land value range
    const clampedLandMin = Math.max(landValueRange[0], filteredRanges.landValue.min);
    const clampedLandMax = Math.min(landValueRange[1], filteredRanges.landValue.max);
    if (clampedLandMin !== landValueRange[0] || clampedLandMax !== landValueRange[1]) {
      setLandValueRange([clampedLandMin, clampedLandMax]);
    }
    
    // Clamp improvement value range
    const clampedImpMin = Math.max(improvementValueRange[0], filteredRanges.improvementValue.min);
    const clampedImpMax = Math.min(improvementValueRange[1], filteredRanges.improvementValue.max);
    if (clampedImpMin !== improvementValueRange[0] || clampedImpMax !== improvementValueRange[1]) {
      setImprovementValueRange([clampedImpMin, clampedImpMax]);
    }
    
    // Clamp land value per sqft range
    const clampedLandSqftMin = Math.max(landValuePerSqftRange[0], filteredRanges.landPerSqft.min);
    const clampedLandSqftMax = Math.min(landValuePerSqftRange[1], filteredRanges.landPerSqft.max);
    if (clampedLandSqftMin !== landValuePerSqftRange[0] || clampedLandSqftMax !== landValuePerSqftRange[1]) {
      setLandValuePerSqftRange([clampedLandSqftMin, clampedLandSqftMax]);
    }
    
    // Clamp bldg to land ratio range
    const clampedBldgMin = Math.max(bldgToLandRatioRange[0], filteredRanges.bldgRatio.min);
    const clampedBldgMax = Math.min(bldgToLandRatioRange[1], filteredRanges.bldgRatio.max);
    if (clampedBldgMin !== bldgToLandRatioRange[0] || clampedBldgMax !== bldgToLandRatioRange[1]) {
      setBldgToLandRatioRange([clampedBldgMin, clampedBldgMax]);
    }
  }, [filteredRanges, properties]);

  // Derived Stats
  const stats = useMemo(() => {
    if (!properties || properties.length === 0) return null;

    const totalValue = properties.reduce(
      (acc, curr) => acc + curr.assessedValue,
      0,
    );
    const avgValue = properties.length > 0 ? totalValue / properties.length : 0;
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

    // Land value per sqft histogram
    const landPerSqftValues = properties.map(p => getLandValuePerSqft(p));
    const actualLandPerSqftMin = landPerSqftValues.length > 0 ? Math.min(...landPerSqftValues) : 0;
    const actualLandPerSqftMax = landPerSqftValues.length > 0 ? Math.max(...landPerSqftValues) : 1;
    const landPerSqftDistribution = [0, 0, 0, 0, 0];
    const landPerSqftStep = (actualLandPerSqftMax - actualLandPerSqftMin) / 5;
    landPerSqftValues.forEach(val => {
      const bucket = landPerSqftStep > 0 ? Math.min(Math.floor((val - actualLandPerSqftMin) / landPerSqftStep), 4) : 0;
      landPerSqftDistribution[bucket]++;
    });
    const landPerSqftChartData = landPerSqftDistribution.map((count, i) => ({
      range: `$${(actualLandPerSqftMin + i * landPerSqftStep).toFixed(2)} - $${(actualLandPerSqftMin + (i + 1) * landPerSqftStep).toFixed(2)}`,
      count,
      binMin: actualLandPerSqftMin + i * landPerSqftStep,
      binMax: actualLandPerSqftMin + (i + 1) * landPerSqftStep,
    }));

    // Building sqft to land sqft ratio histogram
    const bldgRatioValues = properties.map(p => getBldgToLandRatio(p));
    const actualBldgRatioMin = bldgRatioValues.length > 0 ? Math.min(...bldgRatioValues) : 0;
    const actualBldgRatioMax = bldgRatioValues.length > 0 ? Math.max(...bldgRatioValues) : 1;
    const bldgRatioDistribution = [0, 0, 0, 0, 0];
    const bldgRatioStep = (actualBldgRatioMax - actualBldgRatioMin) / 5;
    bldgRatioValues.forEach(val => {
      const bucket = bldgRatioStep > 0 ? Math.min(Math.floor((val - actualBldgRatioMin) / bldgRatioStep), 4) : 0;
      bldgRatioDistribution[bucket]++;
    });
    const bldgRatioChartData = bldgRatioDistribution.map((count, i) => ({
      range: `${(actualBldgRatioMin + i * bldgRatioStep).toFixed(3)} - ${(actualBldgRatioMin + (i + 1) * bldgRatioStep).toFixed(3)}`,
      count,
      binMin: actualBldgRatioMin + i * bldgRatioStep,
      binMax: actualBldgRatioMin + (i + 1) * bldgRatioStep,
    }));

    // Water usage histogram
    const waterUsageValues = properties.map(p => p.avgMonthlyWaterKgal || 0);
    const actualWaterMin = waterUsageValues.length > 0 ? Math.min(...waterUsageValues) : 0;
    const actualWaterMax = waterUsageValues.length > 0 ? Math.max(...waterUsageValues) : 100;
    const waterDistribution = [0, 0, 0, 0, 0];
    const waterStep = (actualWaterMax - actualWaterMin) / 5;
    waterUsageValues.forEach(val => {
      const bucket = waterStep > 0 ? Math.min(Math.floor((val - actualWaterMin) / waterStep), 4) : 0;
      waterDistribution[bucket]++;
    });
    const waterUsageChartData = waterDistribution.map((count, i) => ({
      range: `${(actualWaterMin + i * waterStep).toFixed(1)} - ${(actualWaterMin + (i + 1) * waterStep).toFixed(1)}`,
      count,
      binMin: actualWaterMin + i * waterStep,
      binMax: actualWaterMin + (i + 1) * waterStep,
    }));

    // Electric usage histogram
    const electricUsageValues = properties.map(p => p.avgMonthlyElectricKwh || 0);
    const actualElectricMin = electricUsageValues.length > 0 ? Math.min(...electricUsageValues) : 0;
    const actualElectricMax = electricUsageValues.length > 0 ? Math.max(...electricUsageValues) : 5000;
    const electricDistribution = [0, 0, 0, 0, 0];
    const electricStep = (actualElectricMax - actualElectricMin) / 5;
    electricUsageValues.forEach(val => {
      const bucket = electricStep > 0 ? Math.min(Math.floor((val - actualElectricMin) / electricStep), 4) : 0;
      electricDistribution[bucket]++;
    });
    const electricUsageChartData = electricDistribution.map((count, i) => ({
      range: `${(actualElectricMin + i * electricStep).toFixed(0)} - ${(actualElectricMin + (i + 1) * electricStep).toFixed(0)}`,
      count,
      binMin: actualElectricMin + i * electricStep,
      binMax: actualElectricMin + (i + 1) * electricStep,
    }));

    // Gas usage histogram
    const gasUsageValues = properties.map(p => p.avgMonthlyGasTherms || 0);
    const actualGasMin = gasUsageValues.length > 0 ? Math.min(...gasUsageValues) : 0;
    const actualGasMax = gasUsageValues.length > 0 ? Math.max(...gasUsageValues) : 500;
    const gasDistribution = [0, 0, 0, 0, 0];
    const gasStep = (actualGasMax - actualGasMin) / 5;
    gasUsageValues.forEach(val => {
      const bucket = gasStep > 0 ? Math.min(Math.floor((val - actualGasMin) / gasStep), 4) : 0;
      gasDistribution[bucket]++;
    });
    const gasUsageChartData = gasDistribution.map((count, i) => ({
      range: `${(actualGasMin + i * gasStep).toFixed(1)} - ${(actualGasMin + (i + 1) * gasStep).toFixed(1)}`,
      count,
      binMin: actualGasMin + i * gasStep,
      binMax: actualGasMin + (i + 1) * gasStep,
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

    // Utility usage totals and averages
    const propsWithWater = properties.filter(p => p.avgMonthlyWaterKgal != null && p.avgMonthlyWaterKgal > 0);
    const totalWaterUsage = propsWithWater.reduce((sum, p) => sum + (p.avgMonthlyWaterKgal || 0), 0);
    const avgWaterUsage = propsWithWater.length > 0 ? totalWaterUsage / propsWithWater.length : 0;
    
    const propsWithElectric = properties.filter(p => p.avgMonthlyElectricKwh != null && p.avgMonthlyElectricKwh > 0);
    const totalElectricUsage = propsWithElectric.reduce((sum, p) => sum + (p.avgMonthlyElectricKwh || 0), 0);
    const avgElectricUsage = propsWithElectric.length > 0 ? totalElectricUsage / propsWithElectric.length : 0;
    
    const propsWithGas = properties.filter(p => p.avgMonthlyGasTherms != null && p.avgMonthlyGasTherms > 0);
    const totalGasUsage = propsWithGas.reduce((sum, p) => sum + (p.avgMonthlyGasTherms || 0), 0);
    const avgGasUsage = propsWithGas.length > 0 ? totalGasUsage / propsWithGas.length : 0;

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
      minLandPerSqft: actualLandPerSqftMin,
      maxLandPerSqft: actualLandPerSqftMax,
      minBldgRatio: actualBldgRatioMin,
      maxBldgRatio: actualBldgRatioMax,
      minWaterUsage: actualWaterMin,
      maxWaterUsage: actualWaterMax,
      minElectricUsage: actualElectricMin,
      maxElectricUsage: actualElectricMax,
      minGasUsage: actualGasMin,
      maxGasUsage: actualGasMax,
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
      landPerSqftChartData,
      bldgRatioChartData,
      waterUsageChartData,
      electricUsageChartData,
      gasUsageChartData,
      topLandHoldersData,
      // Utility usage stats
      totalWaterUsage,
      avgWaterUsage,
      waterParcelCount: propsWithWater.length,
      totalElectricUsage,
      avgElectricUsage,
      electricParcelCount: propsWithElectric.length,
      totalGasUsage,
      avgGasUsage,
      gasParcelCount: propsWithGas.length,
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

  // Update range sliders to match filtered data bounds
  // Only called when pendingRangeUpdateRef is set (triggered by user action)
  useEffect(() => {
    if (!stats || !rangesInitialized.current || !pendingRangeUpdateRef.current) return;
    
    // Clear the flag immediately to prevent re-triggering
    pendingRangeUpdateRef.current = false;
    
    // Update all range filter values to match the filtered data bounds
    if (stats.minAssessedValue !== undefined && stats.maxAssessedValue !== undefined) {
      setValueRange([stats.minAssessedValue, stats.maxAssessedValue]);
    }
    if (stats.minTaxValue !== undefined && stats.maxTaxValue !== undefined) {
      setTaxRange([stats.minTaxValue, stats.maxTaxValue]);
    }
    if (stats.minParcelArea !== undefined && stats.maxParcelArea !== undefined) {
      setParcelAreaRange([stats.minParcelArea, stats.maxParcelArea]);
    }
    if (stats.minLandValue !== undefined && stats.maxLandValue !== undefined) {
      setLandValueRange([stats.minLandValue, stats.maxLandValue]);
    }
    if (stats.minImprovementValue !== undefined && stats.maxImprovementValue !== undefined) {
      setImprovementValueRange([stats.minImprovementValue, stats.maxImprovementValue]);
    }
    if (stats.minLandPerSqft !== undefined && stats.maxLandPerSqft !== undefined) {
      setLandValuePerSqftRange([stats.minLandPerSqft, stats.maxLandPerSqft]);
    }
    if (stats.minBldgRatio !== undefined && stats.maxBldgRatio !== undefined) {
      setBldgToLandRatioRange([stats.minBldgRatio, stats.maxBldgRatio]);
    }
    if (stats.minWaterUsage !== undefined && stats.maxWaterUsage !== undefined) {
      setWaterUsageRange([stats.minWaterUsage, stats.maxWaterUsage]);
    }
    if (stats.minElectricUsage !== undefined && stats.maxElectricUsage !== undefined) {
      setElectricUsageRange([stats.minElectricUsage, stats.maxElectricUsage]);
    }
    if (stats.minGasUsage !== undefined && stats.maxGasUsage !== undefined) {
      setGasUsageRange([stats.minGasUsage, stats.maxGasUsage]);
    }
  }, [stats]);
  
  // Trigger range update after stats recalculate (called by user interactions)
  const triggerRangeUpdate = () => {
    pendingRangeUpdateRef.current = true;
  };

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
      const jsonData = properties.map((p) => {
        let geometry = null;
        if (p.geometry) {
          try {
            geometry = JSON.parse(p.geometry);
          } catch {
            geometry = p.geometry;
          }
        }
        return {
          parcelId: p.parcelId,
          address: p.address,
          acct: p.acct,
          legal: p.legal,
          accountType: p.accountType,
          ownerType: p.ownerType,
          zone: p.zone,
          subdiv: p.subdiv,
          owner: p.owner,
          ownerAddress1: p.ownerAddress1,
          ownerCity: p.ownerCity,
          ownerState: p.ownerState,
          ownerZip: p.ownerZip,
          assessedValue: p.assessedValue,
          landValue: p.landValue,
          improvementValue: p.improvementValue,
          landTaxable: p.landTaxable,
          buildingTaxable: p.buildingTaxable,
          totalTaxable: p.totalTaxable,
          hhExemption: p.hhExemption,
          vetExemption: p.vetExemption,
          parcelAreaAcres: p.parcelArea,
          landSqft: p.landSqft,
          buildingSqft: p.buildingSqft,
          millLevy: p.millLevy,
          latitude: p.lat,
          longitude: p.lng,
          assessmentYear: p.assessmentYear,
          avgMonthlyWaterKgal: p.avgMonthlyWaterKgal,
          avgMonthlyElectricKwh: p.avgMonthlyElectricKwh,
          avgMonthlyGasTherms: p.avgMonthlyGasTherms,
          geometry: geometry,
        };
      });
      content = JSON.stringify(jsonData, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      const headers = [
        "Parcel ID",
        "Address",
        "Account",
        "Legal",
        "Account Type",
        "Owner Type",
        "Zone",
        "Subdivision",
        "Owner Name",
        "Owner Address",
        "Owner City",
        "Owner State",
        "Owner Zip",
        "Assessed Value",
        "Land Value",
        "Improvement Value",
        "Land Taxable",
        "Building Taxable",
        "Total Taxable",
        "HH Exemption",
        "Vet Exemption",
        "Parcel Area (acres)",
        "Land Sqft",
        "Building Sqft",
        "Mill Levy",
        "Latitude",
        "Longitude",
        "Assessment Year",
        "Avg Water Usage (kgal/mo)",
        "Avg Electric Usage (kWh/mo)",
        "Avg Gas Usage (therms/mo)",
      ];
      const rows = properties.map((p) => [
        p.parcelId,
        `"${(p.address || "").replace(/"/g, '""')}"`,
        p.acct || "",
        `"${(p.legal || "").replace(/"/g, '""')}"`,
        `"${(p.accountType || "").replace(/"/g, '""')}"`,
        p.ownerType || "",
        `"${(p.zone || "").replace(/"/g, '""')}"`,
        `"${(p.subdiv || "").replace(/"/g, '""')}"`,
        `"${(p.owner || "").replace(/"/g, '""')}"`,
        `"${(p.ownerAddress1 || "").replace(/"/g, '""')}"`,
        `"${(p.ownerCity || "").replace(/"/g, '""')}"`,
        p.ownerState || "",
        p.ownerZip || "",
        p.assessedValue,
        p.landValue,
        p.improvementValue,
        p.landTaxable || 0,
        p.buildingTaxable || 0,
        p.totalTaxable || 0,
        p.hhExemption || 0,
        p.vetExemption || 0,
        p.parcelArea?.toFixed(4) || "",
        p.landSqft || 0,
        p.buildingSqft || 0,
        p.millLevy || "",
        p.lat,
        p.lng,
        p.assessmentYear,
        p.avgMonthlyWaterKgal?.toFixed(2) || "",
        p.avgMonthlyElectricKwh?.toFixed(0) || "",
        p.avgMonthlyGasTherms?.toFixed(1) || "",
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

  const handleUtilityUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-utility-csv", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({ success: true, message: result.message });
        refetch();
      } else {
        setUploadStatus({ success: false, message: result.message || "Upload failed" });
      }
    } catch (error) {
      setUploadStatus({ success: false, message: "Failed to upload file" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
                    setValueRange([sliderBounds.assessedValue.min, sliderBounds.assessedValue.max]);
                    setTaxRange([sliderBounds.tax.min, sliderBounds.tax.max]);
                    setParcelAreaRange([sliderBounds.parcelArea.min, sliderBounds.parcelArea.max]);
                    setLandValueRange([sliderBounds.landValue.min, sliderBounds.landValue.max]);
                    setImprovementValueRange([sliderBounds.improvementValue.min, sliderBounds.improvementValue.max]);
                    setLandValuePerSqftRange([sliderBounds.landPerSqft.min, sliderBounds.landPerSqft.max]);
                    setBldgToLandRatioRange([sliderBounds.bldgRatio.min, sliderBounds.bldgRatio.max]);
                    setWaterUsageRange([sliderBounds.waterUsage.min, sliderBounds.waterUsage.max]);
                    setElectricUsageRange([sliderBounds.electricUsage.min, sliderBounds.electricUsage.max]);
                    setGasUsageRange([sliderBounds.gasUsage.min, sliderBounds.gasUsage.max]);
                    setSelectedAccountTypes([]);
                    setSelectedSubdivisions([]);
                    setSelectedOwnerCityStates([]);
                    setOwnerFilter("");
                    setUseRegex(false);
                    triggerRangeUpdate();
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
                  onValueChange={(v) => {
                    setYear(Number(v));
                    triggerRangeUpdate();
                  }}
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
                        {formatCurrencyShort(valueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.assessedValue.min}
                  max={sliderBounds.assessedValue.max}
                  step={Math.max(1, Math.round((sliderBounds.assessedValue.max - sliderBounds.assessedValue.min) / 100))}
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
                          cursor="pointer"
                          onClick={(data: any) => {
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
                        {formatCurrencyShort(landValueRange[0])}
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
                        {formatCurrencyShort(landValueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.landValue.min}
                  max={sliderBounds.landValue.max}
                  step={Math.max(1, Math.round((sliderBounds.landValue.max - sliderBounds.landValue.min) / 100))}
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
                          cursor="pointer"
                          onClick={(data: any) => {
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
                        {formatCurrencyShort(improvementValueRange[0])}
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
                        {formatCurrencyShort(improvementValueRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.improvementValue.min}
                  max={sliderBounds.improvementValue.max}
                  step={Math.max(1, Math.round((sliderBounds.improvementValue.max - sliderBounds.improvementValue.min) / 100))}
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
                          cursor="pointer"
                          onClick={(data: any) => {
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
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-green-500 text-green-500 rounded text-right"
                        data-testid="input-tax-max"
                      />
                    ) : (
                      <button
                        onClick={handleTaxMaxClick}
                        className="text-green-500 hover:underline cursor-pointer"
                        data-testid="button-edit-tax-max"
                      >
                        {formatCurrencyShort(taxRange[1])}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.tax.min}
                  max={sliderBounds.tax.max}
                  step={Math.max(0.01, (sliderBounds.tax.max - sliderBounds.tax.min) / 100)}
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
                          cursor="pointer"
                          onClick={(data: any) => {
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
                        {parcelAreaRange[0].toFixed(2)}
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
                        {parcelAreaRange[1].toFixed(2)}
                      </button>
                    )}
                    <span className="text-muted-foreground text-[10px]">ac</span>
                  </div>
                </div>
                <Slider
                  min={sliderBounds.parcelArea.min}
                  max={sliderBounds.parcelArea.max}
                  step={Math.max(0.01, (sliderBounds.parcelArea.max - sliderBounds.parcelArea.min) / 100)}
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
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setParcelAreaRange([data.binMin, Math.min(data.binMax, 1200)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Land Value Per Sqft Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Land Value/Sqft
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingLandPerSqftMin ? (
                      <input
                        ref={landPerSqftMinInputRef}
                        type="text"
                        value={tempLandPerSqftMin}
                        onChange={(e) => setTempLandPerSqftMin(e.target.value)}
                        onBlur={handleLandPerSqftMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLandPerSqftMinSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-teal-500 text-teal-500 rounded text-right"
                        data-testid="input-land-per-sqft-min"
                      />
                    ) : (
                      <button
                        onClick={handleLandPerSqftMinClick}
                        className="text-teal-500 hover:underline cursor-pointer"
                        data-testid="button-edit-land-per-sqft-min"
                      >
                        ${landValuePerSqftRange[0].toFixed(2)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingLandPerSqftMax ? (
                      <input
                        ref={landPerSqftMaxInputRef}
                        type="text"
                        value={tempLandPerSqftMax}
                        onChange={(e) => setTempLandPerSqftMax(e.target.value)}
                        onBlur={handleLandPerSqftMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleLandPerSqftMaxSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-teal-500 text-teal-500 rounded text-right"
                        data-testid="input-land-per-sqft-max"
                      />
                    ) : (
                      <button
                        onClick={handleLandPerSqftMaxClick}
                        className="text-teal-500 hover:underline cursor-pointer"
                        data-testid="button-edit-land-per-sqft-max"
                      >
                        ${landValuePerSqftRange[1].toFixed(2)}
                      </button>
                    )}
                    <span className="text-muted-foreground text-[10px]">/sf</span>
                  </div>
                </div>
                <Slider
                  min={sliderBounds.landPerSqft.min}
                  max={sliderBounds.landPerSqft.max}
                  step={Math.max(0.01, (sliderBounds.landPerSqft.max - sliderBounds.landPerSqft.min) / 100)}
                  value={landValuePerSqftRange}
                  onValueChange={(val) =>
                    setLandValuePerSqftRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-teal-500"
                  thumbClassName="border-teal-500"
                  data-testid="slider-land-per-sqft"
                />
                {stats?.landPerSqftChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.landPerSqftChartData}>
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
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setLandValuePerSqftRange([data.binMin, Math.min(data.binMax, 150)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Building Sqft to Land Sqft Ratio Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Bldg/Land Sqft Ratio
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingBldgRatioMin ? (
                      <input
                        ref={bldgRatioMinInputRef}
                        type="text"
                        value={tempBldgRatioMin}
                        onChange={(e) => setTempBldgRatioMin(e.target.value)}
                        onBlur={handleBldgRatioMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleBldgRatioMinSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-pink-500 text-pink-500 rounded text-right"
                        data-testid="input-bldg-ratio-min"
                      />
                    ) : (
                      <button
                        onClick={handleBldgRatioMinClick}
                        className="text-pink-500 hover:underline cursor-pointer"
                        data-testid="button-edit-bldg-ratio-min"
                      >
                        {bldgToLandRatioRange[0].toFixed(3)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingBldgRatioMax ? (
                      <input
                        ref={bldgRatioMaxInputRef}
                        type="text"
                        value={tempBldgRatioMax}
                        onChange={(e) => setTempBldgRatioMax(e.target.value)}
                        onBlur={handleBldgRatioMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleBldgRatioMaxSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-pink-500 text-pink-500 rounded text-right"
                        data-testid="input-bldg-ratio-max"
                      />
                    ) : (
                      <button
                        onClick={handleBldgRatioMaxClick}
                        className="text-pink-500 hover:underline cursor-pointer"
                        data-testid="button-edit-bldg-ratio-max"
                      >
                        {bldgToLandRatioRange[1].toFixed(3)}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.bldgRatio.min}
                  max={sliderBounds.bldgRatio.max}
                  step={Math.max(0.001, (sliderBounds.bldgRatio.max - sliderBounds.bldgRatio.min) / 100)}
                  value={bldgToLandRatioRange}
                  onValueChange={(val) =>
                    setBldgToLandRatioRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-pink-500"
                  thumbClassName="border-pink-500"
                  data-testid="slider-bldg-ratio"
                />
                {stats?.bldgRatioChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.bldgRatioChartData}>
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
                          fill="hsl(330 81% 60%)"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setBldgToLandRatioRange([data.binMin, Math.min(data.binMax, 2)]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Avg Monthly Water Usage Filter */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    Avg Water (kgal/mo)
                  </label>
                  <div className="flex items-center gap-1 text-xs font-mono">
                    {editingWaterMin ? (
                      <input
                        ref={waterMinInputRef}
                        type="text"
                        value={tempWaterMin}
                        onChange={(e) => setTempWaterMin(e.target.value)}
                        onBlur={handleWaterMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleWaterMinSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-cyan-500 text-cyan-500 rounded text-right"
                        data-testid="input-water-min"
                      />
                    ) : (
                      <button
                        onClick={handleWaterMinClick}
                        className="text-cyan-500 hover:underline cursor-pointer"
                        data-testid="button-edit-water-min"
                      >
                        {waterUsageRange[0].toFixed(1)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingWaterMax ? (
                      <input
                        ref={waterMaxInputRef}
                        type="text"
                        value={tempWaterMax}
                        onChange={(e) => setTempWaterMax(e.target.value)}
                        onBlur={handleWaterMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleWaterMaxSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-cyan-500 text-cyan-500 rounded text-right"
                        data-testid="input-water-max"
                      />
                    ) : (
                      <button
                        onClick={handleWaterMaxClick}
                        className="text-cyan-500 hover:underline cursor-pointer"
                        data-testid="button-edit-water-max"
                      >
                        {waterUsageRange[1].toFixed(1)}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.waterUsage.min}
                  max={sliderBounds.waterUsage.max}
                  step={Math.max(0.1, (sliderBounds.waterUsage.max - sliderBounds.waterUsage.min) / 100)}
                  value={waterUsageRange}
                  onValueChange={(val) =>
                    setWaterUsageRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-cyan-500"
                  thumbClassName="border-cyan-500"
                  data-testid="slider-water-usage"
                />
                {stats?.waterUsageChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.waterUsageChartData}>
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
                          fill="hsl(187 85% 53%)"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setWaterUsageRange([data.binMin, data.binMax]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Avg Electric Usage Range */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Zap className="w-3 h-3 text-yellow-500" />
                    Avg Electric (kWh/mo)
                  </label>
                  <div className="flex items-center gap-1 text-xs">
                    {editingElectricMin ? (
                      <input
                        ref={electricMinInputRef}
                        value={tempElectricMin}
                        onChange={(e) => setTempElectricMin(e.target.value)}
                        onBlur={handleElectricMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleElectricMinSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-yellow-500 text-yellow-500 rounded text-right"
                        data-testid="input-electric-min"
                      />
                    ) : (
                      <button
                        onClick={handleElectricMinClick}
                        className="text-yellow-500 hover:underline cursor-pointer"
                        data-testid="button-edit-electric-min"
                      >
                        {electricUsageRange[0].toFixed(0)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingElectricMax ? (
                      <input
                        ref={electricMaxInputRef}
                        value={tempElectricMax}
                        onChange={(e) => setTempElectricMax(e.target.value)}
                        onBlur={handleElectricMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleElectricMaxSubmit()
                        }
                        className="w-20 px-1 py-0.5 text-xs bg-background border border-yellow-500 text-yellow-500 rounded text-right"
                        data-testid="input-electric-max"
                      />
                    ) : (
                      <button
                        onClick={handleElectricMaxClick}
                        className="text-yellow-500 hover:underline cursor-pointer"
                        data-testid="button-edit-electric-max"
                      >
                        {electricUsageRange[1].toFixed(0)}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.electricUsage.min}
                  max={sliderBounds.electricUsage.max}
                  step={Math.max(1, (sliderBounds.electricUsage.max - sliderBounds.electricUsage.min) / 100)}
                  value={electricUsageRange}
                  onValueChange={(val) =>
                    setElectricUsageRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-yellow-500"
                  thumbClassName="border-yellow-500"
                  data-testid="slider-electric-usage"
                />
                {stats?.electricUsageChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.electricUsageChartData}>
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
                          fill="hsl(48 96% 53%)"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setElectricUsageRange([data.binMin, data.binMax]);
                            }
                          }}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Avg Gas Usage Range */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    Avg Gas (therms/mo)
                  </label>
                  <div className="flex items-center gap-1 text-xs">
                    {editingGasMin ? (
                      <input
                        ref={gasMinInputRef}
                        value={tempGasMin}
                        onChange={(e) => setTempGasMin(e.target.value)}
                        onBlur={handleGasMinSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleGasMinSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-orange-500 text-orange-500 rounded text-right"
                        data-testid="input-gas-min"
                      />
                    ) : (
                      <button
                        onClick={handleGasMinClick}
                        className="text-orange-500 hover:underline cursor-pointer"
                        data-testid="button-edit-gas-min"
                      >
                        {gasUsageRange[0].toFixed(1)}
                      </button>
                    )}
                    <span className="text-muted-foreground">-</span>
                    {editingGasMax ? (
                      <input
                        ref={gasMaxInputRef}
                        value={tempGasMax}
                        onChange={(e) => setTempGasMax(e.target.value)}
                        onBlur={handleGasMaxSubmit}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleGasMaxSubmit()
                        }
                        className="w-16 px-1 py-0.5 text-xs bg-background border border-orange-500 text-orange-500 rounded text-right"
                        data-testid="input-gas-max"
                      />
                    ) : (
                      <button
                        onClick={handleGasMaxClick}
                        className="text-orange-500 hover:underline cursor-pointer"
                        data-testid="button-edit-gas-max"
                      >
                        {gasUsageRange[1].toFixed(1)}
                      </button>
                    )}
                  </div>
                </div>
                <Slider
                  min={sliderBounds.gasUsage.min}
                  max={sliderBounds.gasUsage.max}
                  step={Math.max(0.1, (sliderBounds.gasUsage.max - sliderBounds.gasUsage.min) / 100)}
                  value={gasUsageRange}
                  onValueChange={(val) =>
                    setGasUsageRange(val as [number, number])
                  }
                  className="py-2"
                  rangeClassName="bg-orange-500"
                  thumbClassName="border-orange-500"
                  data-testid="slider-gas-usage"
                />
                {stats?.gasUsageChartData && (
                  <div className="h-20 mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.gasUsageChartData}>
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
                          fill="hsl(24 95% 53%)"
                          radius={[4, 4, 0, 0]}
                          cursor="pointer"
                          onClick={(data: any) => {
                            if (data && data.binMin !== undefined && data.binMax !== undefined) {
                              setGasUsageRange([data.binMin, data.binMax]);
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
                      onClick={() => {
                        setSelectedAccountTypes([...uniqueAccountTypes]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-all-account-types"
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAccountTypes([]);
                        triggerRangeUpdate();
                      }}
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
                    const count = propertiesForAccountTypeCounts.filter((p) => p.accountType === type).length;
                    return (
                      <button
                        key={type}
                        onClick={() => {
                          setSelectedAccountTypes((prev) =>
                            isSelected
                              ? prev.filter((t) => t !== type)
                              : [...prev, type]
                          );
                          triggerRangeUpdate();
                        }}
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

              {/* Subdivision Multi-Select */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Subdivision
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedSubdivisions([...uniqueSubdivisions]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-all-subdivisions"
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedSubdivisions([]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-none-subdivisions"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-background/50 rounded-md border border-border p-2 space-y-1">
                  {uniqueSubdivisions.map((subdiv) => {
                    const isSelected = selectedSubdivisions.includes(subdiv);
                    const count = propertiesForSubdivisionCounts.filter((p) => p.subdiv === subdiv).length;
                    return (
                      <button
                        key={subdiv}
                        onClick={() => {
                          setSelectedSubdivisions((prev) =>
                            isSelected
                              ? prev.filter((s) => s !== subdiv)
                              : [...prev, subdiv]
                          );
                          triggerRangeUpdate();
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-subdivision-${subdiv.replace(/\s+/g, '-').toLowerCase()}`}
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
                          <span className="truncate">{subdiv}</span>
                        </div>
                        <span className="text-muted-foreground ml-2">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedSubdivisions.length === 0
                    ? "All subdivisions shown"
                    : `${selectedSubdivisions.length} subdivision${selectedSubdivisions.length > 1 ? "s" : ""} selected`}
                </p>
              </div>

              {/* Zone Multi-Select */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Zone
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedZones([...uniqueZones]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-all-zones"
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedZones([]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-none-zones"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-background/50 rounded-md border border-border p-2 space-y-1">
                  {uniqueZones.map((zone) => {
                    const isSelected = selectedZones.includes(zone);
                    const count = propertiesForZoneCounts.filter((p) => p.zone === zone).length;
                    return (
                      <button
                        key={zone}
                        onClick={() => {
                          setSelectedZones((prev) =>
                            isSelected
                              ? prev.filter((z) => z !== zone)
                              : [...prev, zone]
                          );
                          triggerRangeUpdate();
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-zone-${zone.replace(/\s+/g, '-').toLowerCase()}`}
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
                          <span className="truncate">{zone}</span>
                        </div>
                        <span className="text-muted-foreground ml-2">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedZones.length === 0
                    ? "All zones shown"
                    : `${selectedZones.length} zone${selectedZones.length > 1 ? "s" : ""} selected`}
                </p>
              </div>

              {/* Owner City/State Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Owner City/State
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedOwnerCityStates([...uniqueOwnerCityStates]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-all-owner-city-states"
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setSelectedOwnerCityStates([]);
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-primary"
                      data-testid="button-select-none-owner-city-states"
                    >
                      None
                    </button>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto bg-background/50 rounded-md border border-border p-2 space-y-1">
                  {uniqueOwnerCityStates.map((cityState) => {
                    const isSelected = selectedOwnerCityStates.includes(cityState);
                    const count = propertiesForOwnerCityStateCounts.filter((p) => {
                      const city = p.ownerCity?.trim() || "";
                      const state = p.ownerState?.trim() || "";
                      const combined = [city, state].filter(Boolean).join(", ");
                      return combined === cityState;
                    }).length;
                    return (
                      <button
                        key={cityState}
                        onClick={() => {
                          setSelectedOwnerCityStates((prev) =>
                            isSelected
                              ? prev.filter((cs) => cs !== cityState)
                              : [...prev, cityState]
                          );
                          triggerRangeUpdate();
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                        data-testid={`button-owner-city-state-${cityState.replace(/[\s,]+/g, '-').toLowerCase()}`}
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
                          <span className="truncate">{cityState}</span>
                        </div>
                        <span className="text-muted-foreground ml-2">({count})</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedOwnerCityStates.length === 0
                    ? "All locations shown"
                    : `${selectedOwnerCityStates.length} location${selectedOwnerCityStates.length > 1 ? "s" : ""} selected`}
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
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pendingOwnerFilter}
                    onChange={(e) => setPendingOwnerFilter(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setOwnerFilter(pendingOwnerFilter);
                        triggerRangeUpdate();
                      }
                    }}
                    placeholder={useRegex ? "e.g. ^SMITH|JONES$" : "Search by owner name..."}
                    className="flex-1 px-3 py-2 text-sm bg-background/50 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                    data-testid="input-owner-filter"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      setOwnerFilter(pendingOwnerFilter);
                      triggerRangeUpdate();
                    }}
                    disabled={pendingOwnerFilter === ownerFilter}
                    data-testid="button-apply-owner-filter"
                  >
                    Apply
                  </Button>
                </div>
                {ownerFilter && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {useRegex ? "Using regex pattern (case-insensitive)" : "Using literal string match"}
                    </p>
                    <button
                      onClick={() => {
                        setOwnerFilter("");
                        setPendingOwnerFilter("");
                        triggerRangeUpdate();
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-owner-filter"
                    >
                      Clear
                    </button>
                  </div>
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
                Download {properties?.length || 0} Parcels
              </Button>
            </div>
          </div>

          {/* Utility Data Upload Section */}
          <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary mb-3">
              <Droplets className="w-4 h-4" />
              <span>Utility Data</span>
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleUtilityUpload}
                className="hidden"
                data-testid="input-utility-csv"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-full"
                size="sm"
                data-testid="button-upload-utility"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {isUploading ? "Uploading..." : "Upload Utility CSV"}
              </Button>
              {uploadStatus && (
                <div
                  className={`text-xs p-2 rounded ${
                    uploadStatus.success
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}
                  data-testid="text-upload-status"
                >
                  {uploadStatus.message}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Upload CSV with Parcel, Service, Bill Date, Actual Usage columns. Water (30000) data will be averaged in kgal.
              </p>
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
              <div className="grid grid-cols-2 gap-4">
                <StatsCard
                  title="Parcels"
                  value={stats.count.toLocaleString()}
                  icon={Home}
                  description={`out of ${(initialTotalParcelsRef.current || 0).toLocaleString()}`}
                />
                <StatsCard
                  title="Acreage"
                  value={stats.totalParcelAcres.toLocaleString(undefined, {maximumFractionDigits: 0})}
                  icon={TrendingUp}
                  description={`Avg: ${stats.avgParcelAcres.toFixed(2)} ac`}
                />
              </div>
              <StatsCard
                title="Total Assessed Value"
                value={formatCurrencyShort(stats.totalValue)}
                icon={DollarSign}
                description={`Avg: ${formatCurrencyShort(stats.avgValue)}`}
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

              {/* Utility Usage Stats */}
              {(stats.waterParcelCount > 0 || stats.electricParcelCount > 0 || stats.gasParcelCount > 0) && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Avg Monthly Utility Usage
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.waterParcelCount > 0 && (
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Droplets className="w-3 h-3 text-cyan-500" />
                          <span className="text-[10px] text-cyan-500 uppercase">Water</span>
                        </div>
                        <div className="text-sm font-semibold text-cyan-500">{stats.avgWaterUsage.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">kgal/mo</div>
                        <div className="text-[9px] text-muted-foreground mt-1">{stats.waterParcelCount.toLocaleString()} parcels</div>
                      </div>
                    )}
                    {stats.electricParcelCount > 0 && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          <span className="text-[10px] text-yellow-500 uppercase">Electric</span>
                        </div>
                        <div className="text-sm font-semibold text-yellow-500">{stats.avgElectricUsage.toFixed(0)}</div>
                        <div className="text-[10px] text-muted-foreground">kWh/mo</div>
                        <div className="text-[9px] text-muted-foreground mt-1">{stats.electricParcelCount.toLocaleString()} parcels</div>
                      </div>
                    )}
                    {stats.gasParcelCount > 0 && (
                      <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span className="text-[10px] text-orange-500 uppercase">Gas</span>
                        </div>
                        <div className="text-sm font-semibold text-orange-500">{stats.avgGasUsage.toFixed(1)}</div>
                        <div className="text-[10px] text-muted-foreground">therms/mo</div>
                        <div className="text-[9px] text-muted-foreground mt-1">{stats.gasParcelCount.toLocaleString()} parcels</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Account Types Chart */}
              {stats.accountTypesChartData && stats.accountTypesChartData.length > 0 && (
                <div className="h-64 pt-4">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground block mb-4">
                    Parcels by Account Type
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
                        formatter={(value: number) => [value.toLocaleString(), "Parcels"]}
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

            {properties && mapViewMode === "cluster" && <ClusterLayer points={properties} colorMetric={colorMetric} />}
            {properties && mapViewMode === "polygon" && <PolygonLayer points={properties} colorMetric={colorMetric} />}
          </MapContainer>
        </div>

        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          {/* Map Layer Switcher */}
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-1 flex gap-1">
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
          
          {/* View Mode Switcher */}
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-1 flex gap-1">
            <Button
              size="sm"
              variant={mapViewMode === "cluster" ? "default" : "ghost"}
              onClick={() => setMapViewMode("cluster")}
              data-testid="button-view-cluster"
            >
              Clusters
            </Button>
            <Button
              size="sm"
              variant={mapViewMode === "polygon" ? "default" : "ghost"}
              onClick={() => setMapViewMode("polygon")}
              data-testid="button-view-polygon"
            >
              Parcels
            </Button>
          </div>
          
          {/* Color Metric Selector */}
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-2">
            <label className="text-xs text-muted-foreground mb-1 block">Color by:</label>
            <Select value={colorMetric} onValueChange={(value) => setColorMetric(value as ColorMetric)}>
              <SelectTrigger className="w-[160px] h-8 text-xs" data-testid="select-color-metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(COLOR_METRIC_LABELS) as ColorMetric[]).map((metric) => (
                  <SelectItem key={metric} value={metric} data-testid={`option-color-metric-${metric}`}>
                    {COLOR_METRIC_LABELS[metric]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
