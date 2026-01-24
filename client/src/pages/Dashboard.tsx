import { useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import { useProperties } from "@/hooks/use-properties";
import { HeatmapLayer } from "@/components/MapController";
import { StatsCard } from "@/components/StatsCard";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Map as MapIcon, Layers, Filter, DollarSign, TrendingUp, Home } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// Los Alamos Coordinates
const CENTER_LAT = 35.8800;
const CENTER_LNG = -106.3000;

export default function Dashboard() {
  const [year, setYear] = useState<number>(2024);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 2000000]);
  const [viewMode, setViewMode] = useState<"heat" | "points">("heat");

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

    return { totalValue, avgValue, count: properties.length, chartData };
  }, [properties]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

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
                  <SelectTrigger className="w-full bg-background/50 border-border">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2022">2022</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Assessed Value Range
                  </label>
                  <span className="text-xs text-primary font-mono">
                    {formatCurrency(valueRange[0])} - {valueRange[1] >= 2000000 ? "2M+" : formatCurrency(valueRange[1])}
                  </span>
                </div>
                <Slider
                  defaultValue={[0, 2000000]}
                  max={2000000}
                  step={50000}
                  value={valueRange}
                  onValueChange={(val) => setValueRange(val as [number, number])}
                  className="py-2"
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
                    >
                      <Layers className="w-4 h-4 mr-2" /> Heatmap
                    </Button>
                    <Button 
                      variant={viewMode === "points" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("points")}
                      className="w-full"
                    >
                      <MapIcon className="w-4 h-4 mr-2" /> Markers
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
                value={formatCurrency(stats.totalValue)} 
                icon={DollarSign}
                description="Cumulative value of filtered properties"
              />
              <div className="grid grid-cols-2 gap-4">
                <StatsCard 
                  title="Avg. Value" 
                  value={formatCurrency(stats.avgValue)} 
                  icon={TrendingUp}
                />
                <StatsCard 
                  title="Properties" 
                  value={stats.count.toLocaleString()} 
                  icon={Home}
                />
              </div>

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
        <MapContainer 
          center={[CENTER_LAT, CENTER_LNG]} 
          zoom={13} 
          scrollWheelZoom={true} 
          className="h-full w-full z-0"
        >
          {/* Dark Mode Map Tiles - CartoDB Dark Matter */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          {properties && viewMode === "heat" && (
            <HeatmapLayer points={properties} />
          )}

          {properties && viewMode === "points" && properties.map(property => (
            <Marker 
              key={property.id} 
              position={[property.lat, property.lng]}
            >
              <Popup className="bg-transparent border-none shadow-none">
                <div className="p-1 min-w-[200px]">
                  <h3 className="font-bold text-sm mb-1">{property.address}</h3>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p>Owner: <span className="text-foreground">{property.owner}</span></p>
                    <p>Value: <span className="text-primary font-bold">{formatCurrency(property.assessedValue)}</span></p>
                    <p>Year: {property.assessmentYear}</p>
                  </div>
                </div>
              </Popup>
              <Tooltip>{formatCurrency(property.assessedValue)}</Tooltip>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Map Controls overlay if needed (zoom handled by Leaflet default) */}
        <div className="absolute top-4 right-4 z-[400] md:hidden">
          {/* Mobile indicator or simple legend could go here */}
        </div>
      </div>
    </div>
  );
}
