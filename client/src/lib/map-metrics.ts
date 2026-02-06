import type { PropertyResponse } from "@shared/schema";

export type ColorMetric = "assessedValue" | "landValue" | "improvementValue" | "taxAssessed" | "landValuePerSqft" | "bldgLandRatio" | "zone" | "waterUsage" | "electricUsage" | "gasUsage" | "waterPerBldgSf" | "electricPerBldgSf" | "gasPerBldgSf";

export const COLOR_METRIC_LABELS: Record<ColorMetric, string> = {
  assessedValue: "Assessed Value",
  landValue: "Land Value",
  improvementValue: "Improvement Value",
  taxAssessed: "Tax Assessed",
  landValuePerSqft: "Land Value/Sqft",
  bldgLandRatio: "Bldg/Land Sqft Ratio",
  zone: "Zone",
  waterUsage: "Avg Water (kgal/mo)",
  electricUsage: "Avg Electric (kWh/mo)",
  gasUsage: "Avg Gas (therms/mo)",
  waterPerBldgSf: "Water/Bldg SF (kgal/mo)",
  electricPerBldgSf: "Electric/Bldg SF (kWh/mo)",
  gasPerBldgSf: "Gas/Bldg SF (therms/mo)",
};

// Categorical color palette for zone coloring (25 distinct colors)
const CATEGORICAL_COLORS = [
  "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231",
  "#911eb4", "#46f0f0", "#f032e6", "#bcf60c", "#fabebe",
  "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000",
  "#aaffc3", "#808000", "#ffd8b1", "#000075", "#808080",
  "#ffffff", "#000000", "#a9a9a9", "#ff6347", "#20b2aa"
];

export function getZoneColor(zone: string | null | undefined, zoneList: string[]): string {
  if (!zone) return "#808080"; // Gray for unknown
  const index = zoneList.indexOf(zone);
  if (index === -1) return "#808080";
  return CATEGORICAL_COLORS[index % CATEGORICAL_COLORS.length];
}

export function isCategoricalMetric(metric: ColorMetric): boolean {
  return metric === "zone";
}

export function getMetricValue(property: PropertyResponse, metric: ColorMetric): number | null {
  const landSqft = property.parcelArea != null ? property.parcelArea * 43560 : (property.landSqft ?? null);
  const buildingSqft = property.buildingSqft ?? null;
  const millLevy = property.millLevy || 28.714;
  const isExempt = property.accountType?.toUpperCase().includes("EXEMPT") || false;

  switch (metric) {
    case "assessedValue":
      return property.assessedValue ?? null;
    case "landValue":
      return property.landValue ?? null;
    case "improvementValue":
      return property.improvementValue ?? null;
    case "taxAssessed": {
      if (property.totalTaxable == null) return null;
      if (isExempt) return 0;
      const hhExemptAmount = (property.hhExemption || 0) * millLevy / 1000;
      const vetExemptAmount = (property.vetExemption || 0) * millLevy / 1000;
      return Math.max(0, property.totalTaxable * millLevy / 1000 - hhExemptAmount - vetExemptAmount);
    }
    case "landValuePerSqft":
      if (property.landValue == null || landSqft == null) return null;
      return landSqft > 0 ? property.landValue / landSqft : null;
    case "bldgLandRatio":
      if (buildingSqft == null || landSqft == null) return null;
      return landSqft > 0 ? buildingSqft / landSqft : null;
    case "waterUsage":
      return property.avgMonthlyWaterKgal ?? null;
    case "electricUsage":
      return property.avgMonthlyElectricKwh ?? null;
    case "gasUsage":
      return property.avgMonthlyGasTherms ?? null;
    case "waterPerBldgSf":
      if (property.avgMonthlyWaterKgal == null || buildingSqft == null || buildingSqft <= 0) return null;
      return property.avgMonthlyWaterKgal / buildingSqft;
    case "electricPerBldgSf":
      if (property.avgMonthlyElectricKwh == null || buildingSqft == null || buildingSqft <= 0) return null;
      return property.avgMonthlyElectricKwh / buildingSqft;
    case "gasPerBldgSf":
      if (property.avgMonthlyGasTherms == null || buildingSqft == null || buildingSqft <= 0) return null;
      return property.avgMonthlyGasTherms / buildingSqft;
    default:
      return null;
  }
}
