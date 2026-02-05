import { useState, useRef } from "react";
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
}: RangeFilterProps) {
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMin, setTempMin] = useState("");
  const [tempMax, setTempMax] = useState("");
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  const format = formatValue || ((v: number) => 
    decimals > 0 ? v.toFixed(decimals) : v.toLocaleString()
  );

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {title}
        </label>
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
              {format(value[0])}
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
              {format(value[1])}
            </button>
          )}
          {unit && <span className="text-muted-foreground text-[10px]">{unit}</span>}
        </div>
      </div>
      <Slider
        min={sliderMin}
        max={sliderMax}
        step={calculatedStep}
        value={value}
        onValueChange={(val) => onChange(val as [number, number])}
        className="py-2"
        rangeClassName={rangeClassName}
        thumbClassName={thumbClassName}
        data-testid={`slider-${testIdPrefix}`}
      />
      {histogramData && histogramData.length > 0 && (
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
