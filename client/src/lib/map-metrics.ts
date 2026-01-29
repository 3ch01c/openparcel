import type { PropertyResponse } from "@shared/schema";

export type ColorMetric = "assessedValue" | "landValue" | "improvementValue" | "taxAssessed" | "landValuePerSqft" | "bldgLandRatio";

export const COLOR_METRIC_LABELS: Record<ColorMetric, string> = {
  assessedValue: "Assessed Value",
  landValue: "Land Value",
  improvementValue: "Improvement Value",
  taxAssessed: "Tax Assessed",
  landValuePerSqft: "Land Value/Sqft",
  bldgLandRatio: "Bldg/Land Sqft Ratio",
};

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
    default:
      return 0;
  }
}
