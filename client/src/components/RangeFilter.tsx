import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
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
  prefix?: string;
  decimals?: number;
  testIdPrefix: string;
  inputWidth?: string;
  defaultExpanded?: boolean;
  logarithmic?: boolean;
  onRemove?: () => void;
}

const LOG_STEPS = 1000;

function valueToLogPos(val: number, min: number, max: number): number {
  if (max <= min) return 0;
  const shifted = val - min;
  const range = max - min;
  return Math.log1p(shifted) / Math.log1p(range) * LOG_STEPS;
}

function logPosToValue(pos: number, min: number, max: number): number {
  if (max <= min) return min;
  const range = max - min;
  return Math.expm1(pos / LOG_STEPS * Math.log1p(range)) + min;
}

function snapValue(val: number, step: number | undefined, decimals: number): number {
  if (step && step >= 1) return Math.round(val / step) * step;
  if (decimals > 0) return parseFloat(val.toFixed(decimals));
  return Math.round(val);
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
  prefix = "",
  decimals = 0,
  testIdPrefix,
  inputWidth = "w-20",
  defaultExpanded = false,
  logarithmic = false,
  onRemove,
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

  const isLog = logarithmic && sliderMax > sliderMin;

  const toSlider = useCallback((val: number): number => {
    if (!isLog) return val;
    return valueToLogPos(val, sliderMin, sliderMax);
  }, [isLog, sliderMin, sliderMax]);

  const fromSlider = useCallback((pos: number): number => {
    if (!isLog) return pos;
    const raw = logPosToValue(pos, sliderMin, sliderMax);
    return snapValue(raw, step, decimals);
  }, [isLog, sliderMin, sliderMax, step, decimals]);

  useEffect(() => {
    if (!isDragging.current) {
      setLocalValue(value);
    }
  }, [value]);

  const smartFormat = (v: number): string => {
    if (v === 0) return prefix + (decimals > 0 ? v.toFixed(decimals) : "0");

    const absVal = Math.abs(v);
    const sign = v < 0 ? "-" : "";

    if (absVal < 1) {
      for (let d = 1; d <= 3; d++) {
        const formatted = v.toFixed(d);
        if (formatted[formatted.length - 1] !== '0') return prefix + formatted;
      }
      return prefix + v.toFixed(3);
    }

    if (absVal < 10000) {
      if (decimals > 0) {
        const intDigits = Math.max(1, Math.floor(Math.log10(absVal)) + 1);
        const maxDecimals = Math.max(0, 4 - intDigits);
        const d = Math.min(decimals, maxDecimals);
        return sign + prefix + absVal.toFixed(d);
      }
      return sign + prefix + Math.round(absVal).toLocaleString();
    }

    if (absVal < 1000000) {
      const k = absVal / 1000;
      return sign + prefix + (k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "")) + "K";
    }

    const m = absVal / 1000000;
    return sign + prefix + (m >= 100 ? m.toFixed(0) : m.toFixed(1).replace(/\.0$/, "")) + "M";
  };

  const format = formatValue || smartFormat;

  const parse = parseValue || ((s: string) => {
    const cleaned = s.replace(/[^0-9.-]/g, "");
    return parseFloat(cleaned);
  });

  const linearStep = step || Math.max(
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

  const sliderProps = isLog ? {
    min: 0,
    max: LOG_STEPS,
    step: 1,
    value: [toSlider(localValue[0]), toSlider(localValue[1])] as [number, number],
    onValueChange: (val: number[]) => {
      isDragging.current = true;
      const lo = fromSlider(val[0]);
      const hi = fromSlider(val[1]);
      setLocalValue([Math.min(lo, hi), Math.max(lo, hi)]);
    },
    onValueCommit: (val: number[]) => {
      isDragging.current = false;
      const lo = fromSlider(val[0]);
      const hi = fromSlider(val[1]);
      onChange([Math.min(lo, hi), Math.max(lo, hi)]);
    },
  } : {
    min: sliderMin,
    max: sliderMax,
    step: linearStep,
    value: localValue,
    onValueChange: (val: number[]) => {
      isDragging.current = true;
      setLocalValue(val as [number, number]);
    },
    onValueCommit: (val: number[]) => {
      isDragging.current = false;
      onChange(val as [number, number]);
    },
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center gap-1">
        <div className="flex items-center gap-0.5 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
            data-testid={`button-toggle-${testIdPrefix}`}
          >
            {expanded ? <ChevronDown className="w-3 h-3 shrink-0" /> : <ChevronRight className="w-3 h-3 shrink-0" />}
            {title}
          </button>
          {onRemove && (
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 opacity-0 group-hover/filter:opacity-100 transition-opacity shrink-0"
              onClick={onRemove}
              data-testid={`remove-filter-${testIdPrefix}`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
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
        {...sliderProps}
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
