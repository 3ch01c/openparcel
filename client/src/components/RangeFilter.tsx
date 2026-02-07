import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

interface HistogramBin {
  range: string;
  count: number;
  binMin: number;
  binMax: number;
}

interface RangeFilterProps {
  title: string;
  colorHsl: string;
  rangeClassName: string;
  thumbClassName: string;
  sliderMin: number;
  sliderMax: number;
  filteredMin: number;
  filteredMax: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  histogramData?: HistogramBin[];
  formatValue?: (val: number) => string;
  parseValue?: (str: string) => number;
  step?: number;
  unit?: string;
  decimals?: number;
  testIdPrefix: string;
  inputWidth?: string;
  defaultExpanded?: boolean;
}

export function RangeFilter({
  title,
  colorHsl,
  rangeClassName,
  thumbClassName,
  sliderMin,
  sliderMax,
  filteredMin,
  filteredMax,
  value,
  onChange,
  histogramData,
  formatValue,
  parseValue,
  step,
  unit,
  decimals = 0,
  testIdPrefix,
  inputWidth = "w-20",
  defaultExpanded = true,
}: RangeFilterProps) {
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [localValue, setLocalValue] = useState<[number, number]>(value);
  const isDragging = useRef(false);
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  // Smart formatting: show enough precision to display at least one non-zero digit (max 3 decimals)
  const smartFormat = (v: number): string => {
    if (v === 0) return decimals > 0 ? v.toFixed(decimals) : "0";
    
    const absVal = Math.abs(v);
    // For values >= 1, use the specified decimals
    if (absVal >= 1) {
      return decimals > 0 ? v.toFixed(decimals) : v.toLocaleString();
    }
    
    // For values < 1, find precision needed to show at least one non-zero digit (max 3)
    for (let d = 1; d <= 3; d++) {
      const formatted = v.toFixed(d);
      const lastDigit = formatted[formatted.length - 1];
      if (lastDigit !== '0') {
        return formatted;
      }
    }
    return v.toFixed(3); // Max precision of one thousandth
  };

  const format = formatValue || smartFormat;

  const parse = parseValue || ((s: string) => {
    const cleaned = s.replace(/[^0-9.-]/g, "");
    return parseFloat(cleaned);
  });

  const calculatedStep = step || Math.max(
    decimals > 0 ? Math.pow(10, -decimals) : 1,
    (sliderMax - sliderMin) / 100
  );

  const handleMinClick = () => {
    setTempMin(format(value[0]));
    setEditingMin(true);
    setTimeout(() => minInputRef.current?.select(), 0);
  };

  const handleMaxClick = () => {
    setTempMax(format(value[1]));
    setEditingMax(true);
    setTimeout(() => maxInputRef.current?.select(), 0);
  };

  const handleMinSubmit = () => {
    const val = parse(tempMin);
    if (!isNaN(val)) {
      const clamped = Math.max(sliderMin, Math.min(val, value[1]));
      onChange([clamped, value[1]]);
    }
    setEditingMin(false);
  };

  const handleMaxSubmit = () => {
    const val = parse(tempMax);
    if (!isNaN(val)) {
      const clamped = Math.max(value[0], Math.min(val, sliderMax));
      onChange([value[0], clamped]);
    }
    setEditingMax(false);
  };

  const handleHistogramClick = (data: any) => {
    if (data && data.binMin !== undefined && data.binMax !== undefined) {
      onChange([data.binMin, data.binMax]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          data-testid={`button-toggle-${testIdPrefix}`}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {title}
        </button>
        <div className="flex items-center gap-1 text-xs font-mono">
          {editingMin ? (
            <input
              ref={minInputRef}
              type="text"
              value={tempMin}
              onChange={(e) => setTempMin(e.target.value)}
              onBlur={handleMinSubmit}
              onKeyDown={(e) => e.key === "Enter" && handleMinSubmit()}
              className={`${inputWidth} px-1 py-0.5 text-xs bg-background border rounded text-right`}
              style={{ borderColor: colorHsl, color: colorHsl }}
              data-testid={`input-${testIdPrefix}-min`}
            />
          ) : (
            <button
              onClick={handleMinClick}
              className="hover:underline cursor-pointer"
              style={{ color: colorHsl }}
              data-testid={`button-edit-${testIdPrefix}-min`}
            >
              {format(localValue[0])}
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
              onKeyDown={(e) => e.key === "Enter" && handleMaxSubmit()}
              className={`${inputWidth} px-1 py-0.5 text-xs bg-background border rounded text-right`}
              style={{ borderColor: colorHsl, color: colorHsl }}
              data-testid={`input-${testIdPrefix}-max`}
            />
          ) : (
            <button
              onClick={handleMaxClick}
              className="hover:underline cursor-pointer"
              style={{ color: colorHsl }}
              data-testid={`button-edit-${testIdPrefix}-max`}
            >
              {format(localValue[1])}
            </button>
          )}
          {unit && <span className="text-muted-foreground text-[10px]">{unit}</span>}
        </div>
      </div>
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={calculatedStep}
        value={localValue}
        onValueChange={(val) => {
          isDragging.current = true;
          setLocalValue(val as [number, number]);
        }}
        onValueCommit={(val) => {
          isDragging.current = false;
          onChange(val as [number, number]);
        }}
        className="py-2"
        rangeClassName={rangeClassName}
        thumbClassName={thumbClassName}
        data-testid={`slider-${testIdPrefix}`}
      />
      {expanded && histogramData && histogramData.length > 0 && (
        <div className="h-20 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={histogramData}>
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
                fill={colorHsl}
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={handleHistogramClick}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
