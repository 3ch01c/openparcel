import { useState, useEffect, useMemo } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MultiSelectOption {
  value: string;
  count: number;
}

interface MultiSelectFilterProps {
  title: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onApply: (values: string[]) => void;
  testIdPrefix: string;
  emptyMessage?: string;
  selectedMessage?: (count: number) => string;
  defaultExpanded?: boolean;
}

export function MultiSelectFilter({
  title,
  options,
  selectedValues,
  onApply,
  testIdPrefix,
  emptyMessage = "All shown",
  selectedMessage = (count) => `${count} selected`,
  defaultExpanded = false,
}: MultiSelectFilterProps) {
  // Pending selections (not yet applied)
  const [pendingSelections, setPendingSelections] = useState<string[]>(selectedValues);
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  // Track if there are unapplied changes
  const hasChanges = useMemo(() => {
    if (pendingSelections.length !== selectedValues.length) return true;
    const sortedPending = [...pendingSelections].sort();
    const sortedSelected = [...selectedValues].sort();
    return sortedPending.some((val, i) => val !== sortedSelected[i]);
  }, [pendingSelections, selectedValues]);
  
  // Sync pending selections when applied values change externally
  useEffect(() => {
    setPendingSelections(selectedValues);
  }, [selectedValues]);
  
  const handleToggle = (value: string) => {
    setPendingSelections((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };
  
  const handleSelectAll = () => {
    setPendingSelections(options.map((o) => o.value));
  };
  
  const handleSelectNone = () => {
    setPendingSelections([]);
  };
  
  const handleApply = () => {
    onApply(pendingSelections);
  };
  
  const formatTestId = (value: string) => {
    return value.replace(/[\s,]+/g, '-').toLowerCase();
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
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {pendingSelections.length === 0
              ? emptyMessage
              : selectedMessage(pendingSelections.length)}
          </span>
        </div>
      </div>
      {expanded && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleSelectAll}
              className="text-xs text-muted-foreground hover:text-primary"
              data-testid={`button-select-all-${testIdPrefix}`}
            >
              All
            </button>
            <button
              onClick={handleSelectNone}
              className="text-xs text-muted-foreground hover:text-primary"
              data-testid={`button-select-none-${testIdPrefix}`}
            >
              None
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto bg-background/50 rounded-md border border-border p-2 space-y-1">
            {options.map((option) => {
              const isSelected = pendingSelections.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => handleToggle(option.value)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors ${
                    isSelected
                      ? "bg-primary/20 text-primary"
                      : "hover:bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                  data-testid={`button-${testIdPrefix}-${formatTestId(option.value)}`}
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
                    <span className="truncate">{option.value}</span>
                  </div>
                  <span className="text-muted-foreground ml-2">({option.count})</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleApply}
              disabled={!hasChanges}
              data-testid={`button-apply-${testIdPrefix}`}
            >
              Apply
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
