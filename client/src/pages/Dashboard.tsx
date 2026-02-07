import { useState, useMemo, useRef, useEffect, useTransition, useDeferredValue } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { ClusterLayer, PolygonLayer, type MapViewMode } from "@/components/MapController";
import { type ColorMetric, COLOR_METRIC_LABELS, getMetricValue, isCategoricalMetric } from "@/lib/map-metrics";
import type { PropertyResponse } from "@shared/schema";
import { StatsCard } from "@/components/StatsCard";
import { RangeFilter } from "@/components/RangeFilter";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
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
  ChevronRight,
  BarChart3,
  X,
  PanelLeftClose,
  PanelLeft,
  Droplets,
  Zap,
  Flame,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CursorTooltip } from "@/components/CursorTooltip";
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
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    name: "Dark"
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    name: "Terrain"
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
    name: "Satellite"
  }
};

export default function Dashboard() {
  const [year, setYear] = useState<number>(2025);
  const [mapLayer, setMapLayer] = useState<"dark" | "terrain" | "satellite">("dark");
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
  const [waterPerSfRange, setWaterPerSfRange] = useState<[number, number]>([0, 10]);
  const [electricPerSfRange, setElectricPerSfRange] = useState<[number, number]>([0, 5]);
  const [gasPerSfRange, setGasPerSfRange] = useState<[number, number]>([0, 1]);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [statsOpen, setStatsOpen] = useState(true);
  const [chartAccountTypesOpen, setChartAccountTypesOpen] = useState(true);
  const [chartExemptionsOpen, setChartExemptionsOpen] = useState(true);
  const [chartLandHoldersOpen, setChartLandHoldersOpen] = useState(true);
  const [dataIOOpen, setDataIOOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<string[]>([]);
  const [selectedSubdivisions, setSelectedSubdivisions] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedOwnerCityStates, setSelectedOwnerCityStates] = useState<string[]>([]);
  const [ownerFilter, setOwnerFilter] = useState("");
  const [pendingOwnerFilter, setPendingOwnerFilter] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const rangesInitialized = useRef(false);
  const rangesJustInitialized = useRef(false);
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
    waterPerSf: { min: number; max: number };
    electricPerSf: { min: number; max: number };
    gasPerSf: { min: number; max: number };
  } | null>(null);
  const getLandValuePerSqft = (p: PropertyResponse): number | null => {
    if (p.landValue == null) return null;
    const landSqft = p.landSqft || (p.parcelArea != null ? p.parcelArea * 43560 : null);
    if (landSqft == null || landSqft <= 0) return null;
    return p.landValue / landSqft;
  };

  const getBldgToLandRatio = (p: PropertyResponse): number | null => {
    if (p.buildingSqft == null) return null;
    const landSqft = p.landSqft || (p.parcelArea != null ? p.parcelArea * 43560 : null);
    if (landSqft == null || landSqft <= 0) return null;
    return p.buildingSqft / landSqft;
  };

  const getPropertyTax = (p: PropertyResponse): number | null => {
    if (p.totalTaxable == null) return null;
    const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
    if (isExemptAccount) return 0;
    const millLevy = p.millLevy || 28.714;
    const grossTax = (p.totalTaxable * millLevy) / 1000;
    const hhExemptionAmount = ((p.hhExemption || 0) * millLevy) / 1000;
    const vetExemptionAmount = ((p.vetExemption || 0) * millLevy) / 1000;
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

    const nn = (arr: (number | null | undefined)[]): number[] => arr.filter((v): v is number => v != null);
    const rangeOf = (vals: number[]) => vals.length > 0 ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };

    const taxValues = nn(rawProperties.map(p => getPropertyTax(p)));
    const landPerSqftValues = nn(rawProperties.map(p => getLandValuePerSqft(p)));
    const bldgRatioValues = nn(rawProperties.map(p => getBldgToLandRatio(p)));

    const waterPerSfValues = nn(rawProperties.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyWaterKgal == null) return null;
      return (p.avgMonthlyWaterKgal * 1000) / p.buildingSqft;
    }));
    const electricPerSfValues = nn(rawProperties.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyElectricKwh == null) return null;
      return p.avgMonthlyElectricKwh / p.buildingSqft;
    }));
    const gasPerSfValues = nn(rawProperties.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyGasTherms == null) return null;
      return p.avgMonthlyGasTherms / p.buildingSqft;
    }));

    return {
      assessedValue: rangeOf(nn(rawProperties.map(p => p.assessedValue))),
      tax: rangeOf(taxValues),
      parcelArea: rangeOf(nn(rawProperties.map(p => p.parcelArea))),
      landValue: rangeOf(nn(rawProperties.map(p => p.landValue))),
      improvementValue: rangeOf(nn(rawProperties.map(p => p.improvementValue))),
      landPerSqft: rangeOf(landPerSqftValues),
      bldgRatio: rangeOf(bldgRatioValues),
      waterUsage: rangeOf(nn(rawProperties.map(p => p.avgMonthlyWaterKgal))),
      electricUsage: rangeOf(nn(rawProperties.map(p => p.avgMonthlyElectricKwh))),
      gasUsage: rangeOf(nn(rawProperties.map(p => p.avgMonthlyGasTherms))),
      waterPerSf: rangeOf(waterPerSfValues),
      electricPerSf: rangeOf(electricPerSfValues),
      gasPerSf: rangeOf(gasPerSfValues),
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
        waterPerSf: { min: unfilteredRanges.waterPerSf?.min ?? 0, max: unfilteredRanges.waterPerSf?.max ?? 10 },
        electricPerSf: { min: unfilteredRanges.electricPerSf?.min ?? 0, max: unfilteredRanges.electricPerSf?.max ?? 5 },
        gasPerSf: { min: unfilteredRanges.gasPerSf?.min ?? 0, max: unfilteredRanges.gasPerSf?.max ?? 1 },
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
      setWaterPerSfRange([unfilteredRanges.waterPerSf?.min ?? 0, unfilteredRanges.waterPerSf?.max ?? 10]);
      setElectricPerSfRange([unfilteredRanges.electricPerSf?.min ?? 0, unfilteredRanges.electricPerSf?.max ?? 5]);
      setGasPerSfRange([unfilteredRanges.gasPerSf?.min ?? 0, unfilteredRanges.gasPerSf?.max ?? 1]);
      rangesInitialized.current = true;
      rangesJustInitialized.current = true;
    }
  }, [rawProperties, unfilteredRanges]);
  
  // Use initial bounds for sliders (falls back to unfilteredRanges if not yet initialized)
  const sliderBounds = initialBoundsRef.current || unfilteredRanges;

  // Filter properties by range filters (without account type filter)
  // Used to calculate account type counts based on current other filters
  const isRangeActive = (range: [number, number], bounds: { min: number; max: number }) =>
    range[0] > bounds.min || range[1] < bounds.max;

  const propertiesWithoutAccountTypeFilter = useMemo(() => {
    if (!rawProperties) return [];
    
    const inRange = (val: number | null | undefined, range: [number, number], bounds: { min: number; max: number }) => {
      if (val == null) return !isRangeActive(range, bounds);
      return val >= range[0] && val <= range[1];
    };

    return rawProperties.filter((p) => {
      const tax = getPropertyTax(p);
      const landPerSqft = getLandValuePerSqft(p);
      const bldgRatio = getBldgToLandRatio(p);
      const bldgSf = p.buildingSqft;
      const waterPerSf = (bldgSf != null && bldgSf > 0 && p.avgMonthlyWaterKgal != null)
        ? (p.avgMonthlyWaterKgal * 1000) / bldgSf : null;
      const electricPerSf = (bldgSf != null && bldgSf > 0 && p.avgMonthlyElectricKwh != null)
        ? p.avgMonthlyElectricKwh / bldgSf : null;
      const gasPerSf = (bldgSf != null && bldgSf > 0 && p.avgMonthlyGasTherms != null)
        ? p.avgMonthlyGasTherms / bldgSf : null;
      
      return (
        inRange(tax, taxRange, sliderBounds.tax) &&
        inRange(p.parcelArea, parcelAreaRange, sliderBounds.parcelArea) &&
        inRange(p.landValue, landValueRange, sliderBounds.landValue) &&
        inRange(p.improvementValue, improvementValueRange, sliderBounds.improvementValue) &&
        inRange(landPerSqft, landValuePerSqftRange, sliderBounds.landPerSqft) &&
        inRange(bldgRatio, bldgToLandRatioRange, sliderBounds.bldgRatio) &&
        inRange(p.avgMonthlyWaterKgal, waterUsageRange, sliderBounds.waterUsage) &&
        inRange(p.avgMonthlyElectricKwh, electricUsageRange, sliderBounds.electricUsage) &&
        inRange(p.avgMonthlyGasTherms, gasUsageRange, sliderBounds.gasUsage) &&
        inRange(waterPerSf, waterPerSfRange, sliderBounds.waterPerSf || { min: 0, max: 10 }) &&
        inRange(electricPerSf, electricPerSfRange, sliderBounds.electricPerSf || { min: 0, max: 5 }) &&
        inRange(gasPerSf, gasPerSfRange, sliderBounds.gasPerSf || { min: 0, max: 1 })
      );
    });
  }, [rawProperties, taxRange, parcelAreaRange, landValueRange, improvementValueRange, landValuePerSqftRange, bldgToLandRatioRange, waterUsageRange, electricUsageRange, gasUsageRange, waterPerSfRange, electricPerSfRange, gasPerSfRange, sliderBounds]);

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

  // Create options arrays with counts for multi-select filters
  const accountTypeOptions = useMemo(() => {
    return uniqueAccountTypes.map((type) => ({
      value: type,
      count: propertiesForAccountTypeCounts.filter((p) => p.accountType === type).length,
    }));
  }, [uniqueAccountTypes, propertiesForAccountTypeCounts]);

  const subdivisionOptions = useMemo(() => {
    return uniqueSubdivisions.map((subdiv) => ({
      value: subdiv,
      count: propertiesForSubdivisionCounts.filter((p) => p.subdiv === subdiv).length,
    }));
  }, [uniqueSubdivisions, propertiesForSubdivisionCounts]);

  const zoneOptions = useMemo(() => {
    return uniqueZones.map((zone) => ({
      value: zone,
      count: propertiesForZoneCounts.filter((p) => p.zone === zone).length,
    }));
  }, [uniqueZones, propertiesForZoneCounts]);

  const ownerCityStateOptions = useMemo(() => {
    return uniqueOwnerCityStates.map((cityState) => ({
      value: cityState,
      count: propertiesForOwnerCityStateCounts.filter((p) => {
        const city = p.ownerCity?.trim() || "";
        const state = p.ownerState?.trim() || "";
        const combined = [city, state].filter(Boolean).join(", ");
        return combined === cityState;
      }).length,
    }));
  }, [uniqueOwnerCityStates, propertiesForOwnerCityStateCounts]);

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

  const { includedProperties, excludedProperties } = useMemo(() => {
    if (!properties) return { includedProperties: null, excludedProperties: [] as PropertyResponse[] };
    const included: PropertyResponse[] = [];
    const excluded: PropertyResponse[] = [];
    for (const p of properties) {
      if (getMetricValue(p, colorMetric) != null || isCategoricalMetric(colorMetric)) {
        included.push(p);
      } else {
        excluded.push(p);
      }
    }
    return { includedProperties: included, excludedProperties: excluded };
  }, [properties, colorMetric]);

  const deferredIncluded = useDeferredValue(includedProperties);
  const isFiltering = deferredIncluded !== includedProperties;

  // Calculate filtered data ranges for dynamic slider bounds (from filtered properties)
  const filteredRanges = useMemo(() => {
    if (!properties || properties.length === 0) {
      return unfilteredRanges;
    }

    const nn = (arr: (number | null | undefined)[]): number[] => arr.filter((v): v is number => v != null);
    const rangeOf = (vals: number[]) => vals.length > 0 ? { min: Math.min(...vals), max: Math.max(...vals) } : { min: 0, max: 0 };

    return {
      assessedValue: rangeOf(nn(properties.map(p => p.assessedValue))),
      tax: rangeOf(nn(properties.map(p => getPropertyTax(p)))),
      parcelArea: rangeOf(nn(properties.map(p => p.parcelArea))),
      landValue: rangeOf(nn(properties.map(p => p.landValue))),
      improvementValue: rangeOf(nn(properties.map(p => p.improvementValue))),
      landPerSqft: rangeOf(nn(properties.map(p => getLandValuePerSqft(p)))),
      bldgRatio: rangeOf(nn(properties.map(p => getBldgToLandRatio(p)))),
    };
  }, [properties, unfilteredRanges, getPropertyTax, getLandValuePerSqft, getBldgToLandRatio]);

  // Clamp slider thumb values when they fall outside filtered data bounds
  useEffect(() => {
    if (!rangesInitialized.current || !properties || properties.length === 0) return;
    
    // Skip clamping on the render cycle right after initialization,
    // because filteredRanges may still be stale (computed from pre-init default ranges)
    if (rangesJustInitialized.current) {
      rangesJustInitialized.current = false;
      return;
    }
    
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

    // Note: Utility ranges (water, electric, gas, and per-SF) are NOT clamped here
    // because utility data is sparse (not all properties have it). Clamping sparse
    // data ranges against filtered bounds causes invalid ranges when the filtered set
    // has no utility data, creating a feedback loop that filters out all utility data.
  }, [filteredRanges, properties]);

  // Derived Stats
  const stats = useMemo(() => {
    if (!includedProperties || (includedProperties.length === 0 && excludedProperties.length === 0)) return null;

    const metricExcludedCount = excludedProperties.length;
    const statsProps = includedProperties;

    const totalValue = statsProps.reduce(
      (acc, curr) => acc + curr.assessedValue,
      0,
    );
    const avgValue = statsProps.length > 0 ? totalValue / statsProps.length : 0;
    const maxVal = Math.max(...statsProps.map((p) => p.assessedValue));

    // Simple distribution for chart - start from current filter min
    const minVal = Math.min(...statsProps.map((p) => p.assessedValue));
    const distribution = [0, 0, 0, 0, 0];
    const rangeSpan = maxVal - minVal;
    const step = rangeSpan / 5;
    statsProps.forEach((p) => {
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

    const nnf = (arr: (number | null | undefined)[]): number[] => arr.filter((v): v is number => v != null);

    const median = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const mode = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const freq = new Map<number, number>();
      let maxFreq = 0;
      let modeVal = arr[0];
      arr.forEach(v => {
        const rounded = Math.round(v * 100) / 100;
        const count = (freq.get(rounded) || 0) + 1;
        freq.set(rounded, count);
        if (count > maxFreq) { maxFreq = count; modeVal = rounded; }
      });
      return modeVal;
    };
    const stdev = (arr: number[]): number => {
      if (arr.length < 2) return 0;
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0) / arr.length;
      return Math.sqrt(variance);
    };

    // Tax histogram data (5 bins from 0 to max tax)
    const taxValues = nnf(statsProps.map(p => getPropertyTax(p)));
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
    const parcelAreas = nnf(statsProps.map(p => p.parcelArea));
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
    const landValues = nnf(statsProps.map(p => p.landValue));
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
    const improvementValues = nnf(statsProps.map(p => p.improvementValue));
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
    const landPerSqftValues = nnf(statsProps.map(p => getLandValuePerSqft(p)));
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
    const bldgRatioValues = nnf(statsProps.map(p => getBldgToLandRatio(p)));
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
    const waterUsageValues = nnf(statsProps.map(p => p.avgMonthlyWaterKgal));
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
    const electricUsageValues = nnf(statsProps.map(p => p.avgMonthlyElectricKwh));
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
    const gasUsageValues = nnf(statsProps.map(p => p.avgMonthlyGasTherms));
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

    // Water per building SF histogram
    const waterPerSfValues = nnf(statsProps.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyWaterKgal == null) return null;
      return (p.avgMonthlyWaterKgal * 1000) / p.buildingSqft;
    }));
    const actualWaterPerSfMin = waterPerSfValues.length > 0 ? Math.min(...waterPerSfValues) : 0;
    const actualWaterPerSfMax = waterPerSfValues.length > 0 ? Math.max(...waterPerSfValues) : 10;
    const waterPerSfDistribution = [0, 0, 0, 0, 0];
    const waterPerSfStep = (actualWaterPerSfMax - actualWaterPerSfMin) / 5;
    waterPerSfValues.forEach(val => {
      const bucket = waterPerSfStep > 0 ? Math.min(Math.floor((val - actualWaterPerSfMin) / waterPerSfStep), 4) : 0;
      waterPerSfDistribution[bucket]++;
    });
    const waterPerSfChartData = waterPerSfDistribution.map((count, i) => ({
      range: `${(actualWaterPerSfMin + i * waterPerSfStep).toFixed(2)} - ${(actualWaterPerSfMin + (i + 1) * waterPerSfStep).toFixed(2)}`,
      count,
      binMin: actualWaterPerSfMin + i * waterPerSfStep,
      binMax: actualWaterPerSfMin + (i + 1) * waterPerSfStep,
    }));

    // Electric per building SF histogram
    const electricPerSfValues = nnf(statsProps.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyElectricKwh == null) return null;
      return p.avgMonthlyElectricKwh / p.buildingSqft;
    }));
    const actualElectricPerSfMin = electricPerSfValues.length > 0 ? Math.min(...electricPerSfValues) : 0;
    const actualElectricPerSfMax = electricPerSfValues.length > 0 ? Math.max(...electricPerSfValues) : 5;
    const electricPerSfDistribution = [0, 0, 0, 0, 0];
    const electricPerSfStep = (actualElectricPerSfMax - actualElectricPerSfMin) / 5;
    electricPerSfValues.forEach(val => {
      const bucket = electricPerSfStep > 0 ? Math.min(Math.floor((val - actualElectricPerSfMin) / electricPerSfStep), 4) : 0;
      electricPerSfDistribution[bucket]++;
    });
    const electricPerSfChartData = electricPerSfDistribution.map((count, i) => ({
      range: `${(actualElectricPerSfMin + i * electricPerSfStep).toFixed(3)} - ${(actualElectricPerSfMin + (i + 1) * electricPerSfStep).toFixed(3)}`,
      count,
      binMin: actualElectricPerSfMin + i * electricPerSfStep,
      binMax: actualElectricPerSfMin + (i + 1) * electricPerSfStep,
    }));

    // Gas per building SF histogram
    const gasPerSfValues = nnf(statsProps.map(p => {
      if (p.buildingSqft == null || p.buildingSqft <= 0 || p.avgMonthlyGasTherms == null) return null;
      return p.avgMonthlyGasTherms / p.buildingSqft;
    }));
    const actualGasPerSfMin = gasPerSfValues.length > 0 ? Math.min(...gasPerSfValues) : 0;
    const actualGasPerSfMax = gasPerSfValues.length > 0 ? Math.max(...gasPerSfValues) : 1;
    const gasPerSfDistribution = [0, 0, 0, 0, 0];
    const gasPerSfStep = (actualGasPerSfMax - actualGasPerSfMin) / 5;
    gasPerSfValues.forEach(val => {
      const bucket = gasPerSfStep > 0 ? Math.min(Math.floor((val - actualGasPerSfMin) / gasPerSfStep), 4) : 0;
      gasPerSfDistribution[bucket]++;
    });
    const gasPerSfChartData = gasPerSfDistribution.map((count, i) => ({
      range: `${(actualGasPerSfMin + i * gasPerSfStep).toFixed(4)} - ${(actualGasPerSfMin + (i + 1) * gasPerSfStep).toFixed(4)}`,
      count,
      binMin: actualGasPerSfMin + i * gasPerSfStep,
      binMax: actualGasPerSfMin + (i + 1) * gasPerSfStep,
    }));

    // Calculate total taxes using per-parcel mill levy (excluding EXEMPT statsProps)
    // Formula: (Total Taxable × Mill Levy) - (HH Exemption × Mill Levy) - (Vet Exemption × Mill Levy)
    const totalTaxes = statsProps.reduce((sum, p) => {
      const totalTaxable = p.totalTaxable || 0;
      const hhExemptValue = p.hhExemption || 0;
      const vetExemptValue = p.vetExemption || 0;
      const parcelMillLevy = p.millLevy || 28.714;
      const isExemptAccount = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      if (isExemptAccount) return sum; // EXEMPT statsProps pay $0 tax
      
      const grossTax = (totalTaxable * parcelMillLevy) / 1000;
      const hhExemptionAmount = (hhExemptValue * parcelMillLevy) / 1000;
      const vetExemptionAmount = (vetExemptValue * parcelMillLevy) / 1000;
      
      return sum + Math.max(0, grossTax - hhExemptionAmount - vetExemptionAmount);
    }, 0);
    const avgTaxes = statsProps.length > 0 ? totalTaxes / statsProps.length : 0;
    const taxPctOfTotal = totalValue > 0 ? (totalTaxes / totalValue) * 100 : 0;
    const taxPctOfAvg = avgValue > 0 ? (avgTaxes / avgValue) * 100 : 0;

    // Count statsProps with HH exemption and calculate total tax savings
    const hhExemptionCount = statsProps.filter(p => (p.hhExemption || 0) > 0).length;
    const totalHhExemption = statsProps.reduce((sum, p) => {
      const parcelMillLevy = p.millLevy || 28.714;
      return sum + ((p.hhExemption || 0) * parcelMillLevy) / 1000;
    }, 0);
    
    // Count statsProps with Vet exemption and calculate total tax savings
    const vetExemptionCount = statsProps.filter(p => (p.vetExemption || 0) > 0).length;
    const totalVetExemption = statsProps.reduce((sum, p) => {
      const parcelMillLevy = p.millLevy || 28.714;
      return sum + ((p.vetExemption || 0) * parcelMillLevy) / 1000;
    }, 0);
    
    // Calculate EXEMPT account type exemptions (grouped by account type)
    const exemptAccountExemptions: Record<string, number> = {};
    statsProps.forEach(p => {
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
        count: statsProps.filter(p => p.accountType === type).length,
      })),
    ].filter(d => d.value > 0);
    
    // Total tax exemptions (sum of all exemption values - all in tax dollars)
    const totalExemptAccountValue = Object.values(exemptAccountExemptions).reduce((sum, v) => sum + v, 0);
    const totalTaxExemptions = totalHhExemption + totalVetExemption + totalExemptAccountValue;

    // Aggregate account types
    const accountTypeCounts: Record<string, number> = {};
    statsProps.forEach(p => {
      const acctType = p.accountType || "Unknown";
      accountTypeCounts[acctType] = (accountTypeCounts[acctType] || 0) + 1;
    });
    
    // Build account types chart data (sorted by count descending)
    const accountTypesChartData = Object.entries(accountTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 account types

    const assessedValues = nnf(statsProps.map(p => p.assessedValue));
    const acreageValues = nnf(statsProps.map(p => p.parcelArea));
    const landValueArr = nnf(statsProps.map(p => p.landValue));
    const perParcelTaxValues = nnf(statsProps.map(p => getPropertyTax(p)));
    const perParcelExemptionValues = nnf(statsProps.map(p => {
      const parcelMillLevy = p.millLevy || 28.714;
      const hhVal = ((p.hhExemption || 0) * parcelMillLevy) / 1000;
      const vetVal = ((p.vetExemption || 0) * parcelMillLevy) / 1000;
      const isExempt = p.accountType?.toUpperCase().includes("EXEMPT") || false;
      const exemptVal = isExempt ? ((p.totalTaxable || 0) * parcelMillLevy) / 1000 : 0;
      const total = hhVal + vetVal + exemptVal;
      return total > 0 ? total : null;
    }));

    const iqr = (arr: number[]): [number, number, number] => {
      if (arr.length === 0) return [0, 0, 0];
      const sorted = [...arr].sort((a, b) => a - b);
      const q1Idx = Math.floor(sorted.length * 0.25);
      const q3Idx = Math.floor(sorted.length * 0.75);
      const q1 = sorted[q1Idx];
      const q3 = sorted[q3Idx];
      return [q1, q3, q3 - q1];
    };
    const computeStats = (arr: number[]) => {
      const [q1, q3, iqrVal] = iqr(arr);
      return {
        mean: arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
        median: median(arr),
        mode: mode(arr),
        stdev: stdev(arr),
        q1, q3, iqr: iqrVal,
      };
    };
    const assessedStats = computeStats(assessedValues);
    const acreageStats = computeStats(acreageValues);
    const landValueStats = computeStats(landValueArr);
    const taxStats = computeStats(perParcelTaxValues);
    const exemptionStats = computeStats(perParcelExemptionValues);

    // Count statsProps with no improvement value (land only)
    const landOnlyProps = statsProps.filter(p => (p.improvementValue || 0) === 0);
    const noImprovementCount = landOnlyProps.length;
    const totalLandOnlyAcres = landOnlyProps.reduce((sum, p) => sum + (p.parcelArea || 0), 0);

    // Top land holders - aggregate parcel area (acres) by owner
    const landByOwner: Record<string, { totalAcres: number; propertyCount: number }> = {};
    statsProps.forEach(p => {
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
    const totalParcelAcres = statsProps.reduce((sum, p) => sum + (p.parcelArea || 0), 0);
    const avgParcelAcres = statsProps.length > 0 ? totalParcelAcres / statsProps.length : 0;
    
    // Total land value and avg per acre
    const totalLandValue = statsProps.reduce((sum, p) => sum + (p.landValue || 0), 0);
    const avgLandValuePerAcre = totalParcelAcres > 0 ? totalLandValue / totalParcelAcres : 0;

    // Utility usage totals and averages
    const propsWithWater = statsProps.filter(p => p.avgMonthlyWaterKgal != null && p.avgMonthlyWaterKgal > 0);
    const totalWaterUsage = propsWithWater.reduce((sum, p) => sum + (p.avgMonthlyWaterKgal || 0), 0);
    const avgWaterUsage = propsWithWater.length > 0 ? totalWaterUsage / propsWithWater.length : 0;
    
    const propsWithElectric = statsProps.filter(p => p.avgMonthlyElectricKwh != null && p.avgMonthlyElectricKwh > 0);
    const totalElectricUsage = propsWithElectric.reduce((sum, p) => sum + (p.avgMonthlyElectricKwh || 0), 0);
    const avgElectricUsage = propsWithElectric.length > 0 ? totalElectricUsage / propsWithElectric.length : 0;
    
    const propsWithGas = statsProps.filter(p => p.avgMonthlyGasTherms != null && p.avgMonthlyGasTherms > 0);
    const totalGasUsage = propsWithGas.reduce((sum, p) => sum + (p.avgMonthlyGasTherms || 0), 0);
    const avgGasUsage = propsWithGas.length > 0 ? totalGasUsage / propsWithGas.length : 0;

    const waterValues = nnf(propsWithWater.map(p => p.avgMonthlyWaterKgal));
    const electricValues = nnf(propsWithElectric.map(p => p.avgMonthlyElectricKwh));
    const gasValues = nnf(propsWithGas.map(p => p.avgMonthlyGasTherms));
    const waterStats = computeStats(waterValues);
    const electricStats = computeStats(electricValues);
    const gasStats = computeStats(gasValues);

    return {
      totalValue,
      avgValue,
      count: statsProps.length,
      metricExcludedCount,
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
      minWaterPerSf: actualWaterPerSfMin,
      maxWaterPerSf: actualWaterPerSfMax,
      minElectricPerSf: actualElectricPerSfMin,
      maxElectricPerSf: actualElectricPerSfMax,
      minGasPerSf: actualGasPerSfMin,
      maxGasPerSf: actualGasPerSfMax,
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
      waterPerSfChartData,
      electricPerSfChartData,
      gasPerSfChartData,
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
      assessedStats,
      acreageStats,
      landValueStats,
      taxStats,
      waterStats,
      electricStats,
      gasStats,
      exemptionStats,
    };
  }, [includedProperties, excludedProperties, colorMetric]);

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
    if (stats.minWaterPerSf !== undefined && stats.maxWaterPerSf !== undefined) {
      setWaterPerSfRange([stats.minWaterPerSf, stats.maxWaterPerSf]);
    }
    if (stats.minElectricPerSf !== undefined && stats.maxElectricPerSf !== undefined) {
      setElectricPerSfRange([stats.minElectricPerSf, stats.maxElectricPerSf]);
    }
    if (stats.minGasPerSf !== undefined && stats.maxGasPerSf !== undefined) {
      setGasPerSfRange([stats.minGasPerSf, stats.maxGasPerSf]);
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
                  {filtersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
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
                    setWaterPerSfRange([sliderBounds.waterPerSf?.min ?? 0, sliderBounds.waterPerSf?.max ?? 10]);
                    setElectricPerSfRange([sliderBounds.electricPerSf?.min ?? 0, sliderBounds.electricPerSf?.max ?? 5]);
                    setGasPerSfRange([sliderBounds.gasPerSf?.min ?? 0, sliderBounds.gasPerSf?.max ?? 1]);
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

              <RangeFilter
                title="Assessed Value Range"
                colorHsl="hsl(199 89% 48%)"
                rangeClassName="bg-primary"
                thumbClassName="border-primary"
                sliderMin={sliderBounds.assessedValue.min}
                sliderMax={sliderBounds.assessedValue.max}
                filteredMin={stats?.chartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.chartData?.[stats.chartData.length - 1]?.binMax ?? 5000000}
                value={valueRange}
                onChange={setValueRange}
                histogramData={stats?.chartData}
                formatValue={formatCurrencyShort}
                testIdPrefix="value-range"
              />

              <RangeFilter
                title="Land Value"
                colorHsl="hsl(173 80% 40%)"
                rangeClassName="bg-teal-500"
                thumbClassName="border-teal-500"
                sliderMin={sliderBounds.landValue.min}
                sliderMax={sliderBounds.landValue.max}
                filteredMin={stats?.landChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.landChartData?.[stats.landChartData?.length - 1]?.binMax ?? 2000000}
                value={landValueRange}
                onChange={setLandValueRange}
                histogramData={stats?.landChartData}
                formatValue={formatCurrencyShort}
                testIdPrefix="land-value"
              />

              <RangeFilter
                title="Improvement Value"
                colorHsl="hsl(24 95% 50%)"
                rangeClassName="bg-orange-500"
                thumbClassName="border-orange-500"
                sliderMin={sliderBounds.improvementValue.min}
                sliderMax={sliderBounds.improvementValue.max}
                filteredMin={stats?.improvementChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.improvementChartData?.[stats.improvementChartData?.length - 1]?.binMax ?? 5000000}
                value={improvementValueRange}
                onChange={setImprovementValueRange}
                histogramData={stats?.improvementChartData}
                formatValue={formatCurrencyShort}
                testIdPrefix="improvement-value"
              />

              <RangeFilter
                title="Tax Assessed"
                colorHsl="hsl(142 71% 45%)"
                rangeClassName="bg-green-500"
                thumbClassName="border-green-500"
                sliderMin={sliderBounds.tax.min}
                sliderMax={sliderBounds.tax.max}
                filteredMin={stats?.taxChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.taxChartData?.[stats.taxChartData?.length - 1]?.binMax ?? 50000}
                value={taxRange}
                onChange={setTaxRange}
                histogramData={stats?.taxChartData}
                formatValue={formatCurrencyShort}
                testIdPrefix="tax-range"
              />

              <RangeFilter
                title="Parcel Area (Acres)"
                colorHsl="hsl(271 81% 56%)"
                rangeClassName="bg-purple-500"
                thumbClassName="border-purple-500"
                sliderMin={sliderBounds.parcelArea.min}
                sliderMax={sliderBounds.parcelArea.max}
                filteredMin={stats?.parcelChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.parcelChartData?.[stats.parcelChartData?.length - 1]?.binMax ?? 1200}
                value={parcelAreaRange}
                onChange={setParcelAreaRange}
                histogramData={stats?.parcelChartData}
                decimals={2}
                unit="ac"
                testIdPrefix="parcel-area"
                inputWidth="w-16"
              />

              <RangeFilter
                title="Land Value/Sqft"
                colorHsl="hsl(173 80% 40%)"
                rangeClassName="bg-teal-500"
                thumbClassName="border-teal-500"
                sliderMin={sliderBounds.landPerSqft.min}
                sliderMax={sliderBounds.landPerSqft.max}
                filteredMin={stats?.landPerSqftChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.landPerSqftChartData?.[stats.landPerSqftChartData?.length - 1]?.binMax ?? 150}
                value={landValuePerSqftRange}
                onChange={setLandValuePerSqftRange}
                histogramData={stats?.landPerSqftChartData}
                formatValue={(v) => `$${v.toFixed(2)}`}
                decimals={2}
                unit="/sf"
                testIdPrefix="land-per-sqft"
                inputWidth="w-16"
              />

              <RangeFilter
                title="Bldg/Land Sqft Ratio"
                colorHsl="hsl(330 81% 60%)"
                rangeClassName="bg-pink-500"
                thumbClassName="border-pink-500"
                sliderMin={sliderBounds.bldgRatio.min}
                sliderMax={sliderBounds.bldgRatio.max}
                filteredMin={stats?.bldgRatioChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.bldgRatioChartData?.[stats.bldgRatioChartData?.length - 1]?.binMax ?? 2}
                value={bldgToLandRatioRange}
                onChange={setBldgToLandRatioRange}
                histogramData={stats?.bldgRatioChartData}
                decimals={3}
                testIdPrefix="bldg-ratio"
                inputWidth="w-16"
              />

              <RangeFilter
                title="Avg Water (kgal/mo)"
                colorHsl="hsl(187 85% 53%)"
                rangeClassName="bg-cyan-500"
                thumbClassName="border-cyan-500"
                sliderMin={sliderBounds.waterUsage.min}
                sliderMax={sliderBounds.waterUsage.max}
                filteredMin={stats?.waterUsageChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.waterUsageChartData?.[stats.waterUsageChartData?.length - 1]?.binMax ?? 100}
                value={waterUsageRange}
                onChange={setWaterUsageRange}
                histogramData={stats?.waterUsageChartData}
                decimals={1}
                testIdPrefix="water-usage"
                inputWidth="w-16"
              />

              <RangeFilter
                title="Avg Electric (kWh/mo)"
                colorHsl="hsl(48 96% 53%)"
                rangeClassName="bg-yellow-500"
                thumbClassName="border-yellow-500"
                sliderMin={sliderBounds.electricUsage.min}
                sliderMax={sliderBounds.electricUsage.max}
                filteredMin={stats?.electricUsageChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.electricUsageChartData?.[stats.electricUsageChartData?.length - 1]?.binMax ?? 5000}
                value={electricUsageRange}
                onChange={setElectricUsageRange}
                histogramData={stats?.electricUsageChartData}
                decimals={0}
                testIdPrefix="electric-usage"
              />

              <RangeFilter
                title="Avg Gas (therms/mo)"
                colorHsl="hsl(24 95% 53%)"
                rangeClassName="bg-orange-500"
                thumbClassName="border-orange-500"
                sliderMin={sliderBounds.gasUsage.min}
                sliderMax={sliderBounds.gasUsage.max}
                filteredMin={stats?.gasUsageChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.gasUsageChartData?.[stats.gasUsageChartData?.length - 1]?.binMax ?? 500}
                value={gasUsageRange}
                onChange={setGasUsageRange}
                histogramData={stats?.gasUsageChartData}
                decimals={1}
                testIdPrefix="gas-usage"
                inputWidth="w-16"
              />

              {/* Water Per SF Range Filter */}
              <RangeFilter
                title="Water/Bldg SF (gal/mo)"
                colorHsl="hsl(187 100% 42%)"
                rangeClassName="bg-cyan-500"
                thumbClassName="border-cyan-500"
                sliderMin={sliderBounds.waterPerSf?.min ?? 0}
                sliderMax={sliderBounds.waterPerSf?.max ?? 10}
                filteredMin={stats?.waterPerSfChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.waterPerSfChartData?.[4]?.binMax ?? 10}
                value={waterPerSfRange}
                onChange={setWaterPerSfRange}
                histogramData={stats?.waterPerSfChartData}
                decimals={2}
                testIdPrefix="water-per-sf"
                inputWidth="w-16"
              />

              {/* Electric Per SF Range Filter */}
              <RangeFilter
                title="Electric/Bldg SF (kWh/mo)"
                colorHsl="hsl(48 96% 53%)"
                rangeClassName="bg-yellow-400"
                thumbClassName="border-yellow-400"
                sliderMin={sliderBounds.electricPerSf?.min ?? 0}
                sliderMax={sliderBounds.electricPerSf?.max ?? 5}
                filteredMin={stats?.electricPerSfChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.electricPerSfChartData?.[4]?.binMax ?? 5}
                value={electricPerSfRange}
                onChange={setElectricPerSfRange}
                histogramData={stats?.electricPerSfChartData}
                decimals={3}
                testIdPrefix="electric-per-sf"
                inputWidth="w-16"
              />

              {/* Gas Per SF Range Filter */}
              <RangeFilter
                title="Gas/Bldg SF (therms/mo)"
                colorHsl="hsl(24 95% 53%)"
                rangeClassName="bg-orange-500"
                thumbClassName="border-orange-500"
                sliderMin={sliderBounds.gasPerSf?.min ?? 0}
                sliderMax={sliderBounds.gasPerSf?.max ?? 1}
                filteredMin={stats?.gasPerSfChartData?.[0]?.binMin ?? 0}
                filteredMax={stats?.gasPerSfChartData?.[4]?.binMax ?? 1}
                value={gasPerSfRange}
                onChange={setGasPerSfRange}
                histogramData={stats?.gasPerSfChartData}
                decimals={4}
                testIdPrefix="gas-per-sf"
                inputWidth="w-16"
              />

              {/* Account Type Multi-Select */}
              <MultiSelectFilter
                title="Account Type"
                options={accountTypeOptions}
                selectedValues={selectedAccountTypes}
                onApply={(values) => {
                  setSelectedAccountTypes(values);
                  triggerRangeUpdate();
                }}
                testIdPrefix="account-types"
                emptyMessage="All types shown"
                selectedMessage={(count) => `${count} type${count > 1 ? "s" : ""} selected`}
              />

              {/* Subdivision Multi-Select */}
              <MultiSelectFilter
                title="Subdivision"
                options={subdivisionOptions}
                selectedValues={selectedSubdivisions}
                onApply={(values) => {
                  setSelectedSubdivisions(values);
                  triggerRangeUpdate();
                }}
                testIdPrefix="subdivisions"
                emptyMessage="All subdivisions shown"
                selectedMessage={(count) => `${count} subdivision${count > 1 ? "s" : ""} selected`}
              />

              {/* Zone Multi-Select */}
              <MultiSelectFilter
                title="Zone"
                options={zoneOptions}
                selectedValues={selectedZones}
                onApply={(values) => {
                  setSelectedZones(values);
                  triggerRangeUpdate();
                }}
                testIdPrefix="zones"
                emptyMessage="All zones shown"
                selectedMessage={(count) => `${count} zone${count > 1 ? "s" : ""} selected`}
              />

              {/* Owner City/State Filter */}
              <MultiSelectFilter
                title="Owner City/State"
                options={ownerCityStateOptions}
                selectedValues={selectedOwnerCityStates}
                onApply={(values) => {
                  setSelectedOwnerCityStates(values);
                  triggerRangeUpdate();
                }}
                testIdPrefix="owner-city-states"
                emptyMessage="All locations shown"
                selectedMessage={(count) => `${count} location${count > 1 ? "s" : ""} selected`}
              />

              {/* Owner Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
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

          {/* Import/Export Data Section - Collapsible */}
          <Collapsible open={dataIOOpen} onOpenChange={setDataIOOpen}>
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-primary hover:text-primary/80 transition-colors" data-testid="button-toggle-data-io">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  <span>Import / Export Data</span>
                </div>
                {dataIOOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Export</label>
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

                <div className="space-y-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Import Utility Data</label>
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
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Stats Section - Collapsible */}
          <Collapsible open={statsOpen} onOpenChange={setStatsOpen}>
            <div className="bg-secondary/30 p-4 rounded-xl border border-white/5">
              <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-semibold text-primary hover:text-primary/80 transition-colors" data-testid="button-toggle-stats">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Statistics</span>
                </div>
                {statsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </CollapsibleTrigger>

              <CollapsibleContent className="pt-4 pb-6">
                {/* Stats Summary */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading assessment data...</p>
            </div>
          ) : stats ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-4">
                <CursorTooltip content={
                  <div className="text-xs space-y-1">
                    <div>{((initialTotalParcelsRef.current || 0) - (properties?.length || 0)).toLocaleString()} hidden by filters</div>
                    {stats.metricExcludedCount > 0 && (
                      <div>{stats.metricExcludedCount.toLocaleString()} hidden for missing metric data</div>
                    )}
                  </div>
                }>
                  <StatsCard
                    title="Parcels"
                    value={stats.count.toLocaleString()}
                    icon={Home}
                    description={`out of ${(initialTotalParcelsRef.current || 0).toLocaleString()}`}
                  />
                </CursorTooltip>
                <CursorTooltip content={
                  <div className="text-xs space-y-1">
                    <div>Mean: {stats.acreageStats.mean.toFixed(2)} ac</div>
                    <div>Median: {stats.acreageStats.median.toFixed(2)} ac</div>


                    <div>IQR: {stats.acreageStats.q1.toFixed(2)}–{stats.acreageStats.q3.toFixed(2)} ac ({stats.acreageStats.iqr.toFixed(2)})</div>
                  </div>
                }>
                  <StatsCard
                    title="Acreage"
                    value={stats.totalParcelAcres.toLocaleString(undefined, {maximumFractionDigits: 0})}
                    icon={TrendingUp}
                    description={`Median: ${stats.acreageStats.median.toFixed(2)} ac`}
                  />
                </CursorTooltip>
              </div>
              <CursorTooltip content={
                <div className="text-xs space-y-1">
                  <div>Mean: {formatCurrencyShort(stats.assessedStats.mean)}</div>
                  <div>Median: {formatCurrencyShort(stats.assessedStats.median)}</div>


                  <div>IQR: {formatCurrencyShort(stats.assessedStats.q1)}–{formatCurrencyShort(stats.assessedStats.q3)} ({formatCurrencyShort(stats.assessedStats.iqr)})</div>
                </div>
              }>
                <StatsCard
                  title="Total Assessed Value"
                  value={formatCurrencyShort(stats.totalValue)}
                  icon={DollarSign}
                  description={`Median: ${formatCurrencyShort(stats.assessedStats.median)}`}
                />
              </CursorTooltip>
              <CursorTooltip content={
                <div className="text-xs space-y-1">
                  <div>Mean: {formatCurrencyShort(stats.landValueStats.mean)}</div>
                  <div>Median: {formatCurrencyShort(stats.landValueStats.median)}</div>


                  <div>IQR: {formatCurrencyShort(stats.landValueStats.q1)}–{formatCurrencyShort(stats.landValueStats.q3)} ({formatCurrencyShort(stats.landValueStats.iqr)})</div>
                </div>
              }>
                <StatsCard
                  title="Total Land Value"
                  value={formatCurrencyShort(stats.totalLandValue)}
                  icon={DollarSign}
                  description={`Median: ${formatCurrencyShort(stats.landValueStats.median)}`}
                />
              </CursorTooltip>
              <CursorTooltip content={
                <div className="text-xs space-y-1">
                  <div>Mean: {formatCurrencyShort(stats.taxStats.mean)} ({stats.assessedStats.mean > 0 ? ((stats.taxStats.mean / stats.assessedStats.mean) * 100).toFixed(2) : '0.00'}% eff. rate)</div>
                  <div>Median: {formatCurrencyShort(stats.taxStats.median)} ({stats.assessedStats.median > 0 ? ((stats.taxStats.median / stats.assessedStats.median) * 100).toFixed(2) : '0.00'}% eff. rate)</div>


                  <div>IQR: {formatCurrencyShort(stats.taxStats.q1)}–{formatCurrencyShort(stats.taxStats.q3)} ({formatCurrencyShort(stats.taxStats.iqr)})</div>
                </div>
              }>
                <StatsCard
                  title="Total Tax Assessed"
                  value={formatCurrencyShort(stats.totalTaxes)}
                  icon={DollarSign}
                  description={`Median: ${formatCurrencyShort(stats.taxStats.median)} (${stats.taxPctOfTotal.toFixed(2)}% eff. rate)`}
                />
              </CursorTooltip>
              <CursorTooltip content={
                <div className="text-xs space-y-1">
                  <div>Mean: {formatCurrencyShort(stats.exemptionStats.mean)}</div>
                  <div>Median: {formatCurrencyShort(stats.exemptionStats.median)}</div>


                  <div>IQR: {formatCurrencyShort(stats.exemptionStats.q1)}–{formatCurrencyShort(stats.exemptionStats.q3)} ({formatCurrencyShort(stats.exemptionStats.iqr)})</div>
                </div>
              }>
                <StatsCard
                  title="Total Tax Exemptions"
                  value={formatCurrencyShort(stats.totalTaxExemptions)}
                  icon={DollarSign}
                  description={`Median: ${formatCurrencyShort(stats.exemptionStats.median)}`}
                />
              </CursorTooltip>

              {/* Utility Usage Stats */}
              {(stats.waterParcelCount > 0 || stats.electricParcelCount > 0 || stats.gasParcelCount > 0) && (
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Avg Monthly Utility Usage
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {stats.waterParcelCount > 0 && (
                      <CursorTooltip content={
                        <div className="text-xs space-y-1">
                          <div>Mean: {stats.waterStats.mean.toFixed(1)} kgal</div>
                          <div>Median: {stats.waterStats.median.toFixed(1)} kgal</div>


                          <div>IQR: {stats.waterStats.q1.toFixed(1)}–{stats.waterStats.q3.toFixed(1)} kgal ({stats.waterStats.iqr.toFixed(1)})</div>
                        </div>
                      }>
                        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Droplets className="w-3 h-3 text-cyan-500" />
                            <span className="text-[10px] text-cyan-500 uppercase">Water</span>
                          </div>
                          <div className="text-sm font-semibold text-cyan-500">{stats.avgWaterUsage.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">kgal/mo</div>
                          <div className="text-[9px] text-muted-foreground mt-1">{stats.waterParcelCount.toLocaleString()} parcels</div>
                        </div>
                      </CursorTooltip>
                    )}
                    {stats.electricParcelCount > 0 && (
                      <CursorTooltip content={
                        <div className="text-xs space-y-1">
                          <div>Mean: {stats.electricStats.mean.toFixed(0)} kWh</div>
                          <div>Median: {stats.electricStats.median.toFixed(0)} kWh</div>


                          <div>IQR: {stats.electricStats.q1.toFixed(0)}–{stats.electricStats.q3.toFixed(0)} kWh ({stats.electricStats.iqr.toFixed(0)})</div>
                        </div>
                      }>
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Zap className="w-3 h-3 text-yellow-500" />
                            <span className="text-[10px] text-yellow-500 uppercase">Electric</span>
                          </div>
                          <div className="text-sm font-semibold text-yellow-500">{stats.avgElectricUsage.toFixed(0)}</div>
                          <div className="text-[10px] text-muted-foreground">kWh/mo</div>
                          <div className="text-[9px] text-muted-foreground mt-1">{stats.electricParcelCount.toLocaleString()} parcels</div>
                        </div>
                      </CursorTooltip>
                    )}
                    {stats.gasParcelCount > 0 && (
                      <CursorTooltip content={
                        <div className="text-xs space-y-1">
                          <div>Mean: {stats.gasStats.mean.toFixed(1)} therms</div>
                          <div>Median: {stats.gasStats.median.toFixed(1)} therms</div>


                          <div>IQR: {stats.gasStats.q1.toFixed(1)}–{stats.gasStats.q3.toFixed(1)} therms ({stats.gasStats.iqr.toFixed(1)})</div>
                        </div>
                      }>
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Flame className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] text-orange-500 uppercase">Gas</span>
                          </div>
                          <div className="text-sm font-semibold text-orange-500">{stats.avgGasUsage.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">therms/mo</div>
                          <div className="text-[9px] text-muted-foreground mt-1">{stats.gasParcelCount.toLocaleString()} parcels</div>
                        </div>
                      </CursorTooltip>
                    )}
                  </div>
                </div>
              )}

              {/* Account Types Chart */}
              {stats.accountTypesChartData && stats.accountTypesChartData.length > 0 && (
                <Collapsible open={chartAccountTypesOpen} onOpenChange={setChartAccountTypesOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors" data-testid="button-toggle-account-types-chart">
                    {chartAccountTypesOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>Parcels by Account Type</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div style={{ height: `${stats.accountTypesChartData.length * 32 + 16}px` }} className="pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={stats.accountTypesChartData} 
                          layout="vertical"
                          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                          barCategoryGap={4}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="type" 
                            width={140}
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
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Tax Exemptions Chart */}
              {stats.exemptionsChartData && stats.exemptionsChartData.length > 0 && (
                <Collapsible open={chartExemptionsOpen} onOpenChange={setChartExemptionsOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors" data-testid="button-toggle-exemptions-chart">
                    {chartExemptionsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>Tax Exemptions by Type</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div style={{ height: `${stats.exemptionsChartData.length * 32 + 16}px` }} className="pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={stats.exemptionsChartData} 
                          layout="vertical"
                          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                          barCategoryGap={4}
                        >
                          <XAxis type="number" hide />
                          <YAxis 
                            type="category" 
                            dataKey="type" 
                            width={140}
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
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Top Land Holders Chart */}
              {stats.topLandHoldersData && stats.topLandHoldersData.length > 0 && (
                <Collapsible open={chartLandHoldersOpen} onOpenChange={setChartLandHoldersOpen}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full pt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors" data-testid="button-toggle-land-holders-chart">
                    {chartLandHoldersOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                    <span>Top Land Holders (Acres)</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div style={{ height: `${stats.topLandHoldersData.length * 32 + 16}px` }} className="pt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart 
                          data={stats.topLandHoldersData} 
                          layout="vertical"
                          margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
                          barCategoryGap={4}
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
                            fill="hsl(25 95% 53%)"
                            radius={[0, 4, 4, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
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

            {deferredIncluded && mapViewMode === "cluster" && <ClusterLayer points={deferredIncluded} colorMetric={colorMetric} />}
            {deferredIncluded && mapViewMode === "polygon" && <PolygonLayer points={deferredIncluded} colorMetric={colorMetric} />}
          </MapContainer>
        </div>

        {/* Filtering spinner overlay */}
        {isFiltering && (
          <div className="absolute inset-0 z-[450] flex items-center justify-center bg-black/20 backdrop-blur-[1px] pointer-events-none" data-testid="filtering-spinner">
            <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-foreground">Loading...</span>
            </div>
          </div>
        )}

        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          {/* Map Layer Switcher */}
          <div className="bg-background/90 backdrop-blur-sm rounded-lg border border-border shadow-lg p-1 flex gap-1">
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((key) => (
              <button
                key={key}
                onClick={() => setMapLayer(key)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  mapLayer === key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                data-testid={`button-map-${key}`}
              >
                {TILE_LAYERS[key].name}
              </button>
            ))}
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
