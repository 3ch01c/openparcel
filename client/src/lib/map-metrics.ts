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
  waterPerBldgSf: "Water/Bldg SF (gal/mo)",
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

export function getMetricValue(property: PropertyResponse, metric: ColorMetric): number {
  const landSqft = (property.parcelArea || 0) * 43560;
  const buildingSqft = property.buildingSqft || 0;
  const millLevy = property.millLevy || 28.714;
  const isExempt = property.accountType?.toUpperCase().includes("EXEMPT") || false;
  const hhExemptAmount = (property.hhExemption || 0) * millLevy / 1000;
  const vetExemptAmount = (property.vetExemption || 0) * millLevy / 1000;
  const taxAssessed = isExempt ? 0 : Math.max(0, (property.totalTaxable || 0) * millLevy / 1000 - hhExemptAmount - vetExemptAmount);

  switch (metric) {
    case "assessedValue":
      return property.assessedValue || 0;
    case "landValue":
      return property.landValue || 0;
    case "improvementValue":
      return property.improvementValue || 0;
    case "taxAssessed":
      return taxAssessed;
    case "landValuePerSqft":
      return landSqft > 0 ? (property.landValue || 0) / landSqft : 0;
    case "bldgLandRatio":
      return landSqft > 0 ? buildingSqft / landSqft : 0;
    case "waterUsage":
      return property.avgMonthlyWaterKgal || 0;
    case "electricUsage":
      return property.avgMonthlyElectricKwh || 0;
    case "gasUsage":
      return property.avgMonthlyGasTherms || 0;
    case "waterPerBldgSf":
      // Convert kgal to gallons (×1000) and divide by building SF
      return buildingSqft > 0 ? ((property.avgMonthlyWaterKgal || 0) * 1000) / buildingSqft : 0;
    case "electricPerBldgSf":
      return buildingSqft > 0 ? (property.avgMonthlyElectricKwh || 0) / buildingSqft : 0;
    case "gasPerBldgSf":
      return buildingSqft > 0 ? (property.avgMonthlyGasTherms || 0) / buildingSqft : 0;
    default:
      return 0;
  }
}
