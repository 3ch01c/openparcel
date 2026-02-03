import { pgTable, text, serial, integer, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  parcelId: text("parcel_id").notNull().unique(),
  address: text("address").notNull(),
  owner: text("owner").notNull(),
  assessedValue: doublePrecision("assessed_value").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  assessmentYear: integer("assessment_year").notNull(),
  parcelArea: doublePrecision("parcel_area"),
  landValue: doublePrecision("land_value"),
  improvementValue: doublePrecision("improvement_value"),
  landTaxable: doublePrecision("land_taxable"),
  buildingTaxable: doublePrecision("building_taxable"),
  totalTaxable: doublePrecision("total_taxable"),
  hhExemption: doublePrecision("hh_exemption"),
  vetExemption: doublePrecision("vet_exemption"),
  landSqft: doublePrecision("land_sqft"),
  buildingSqft: doublePrecision("building_sqft"),
  millLevy: doublePrecision("mill_levy"),
  accountType: text("account_type"),
  acct: text("acct"),
  legal: text("legal"),
  ownerType: text("owner_type"),
  zone: text("zone"),
  subdiv: text("subdiv"),
  ownerAddress1: text("owner_address1"),
  ownerCity: text("owner_city"),
  ownerState: text("owner_state"),
  ownerZip: text("owner_zip"),
  geometry: text("geometry"),
  avgMonthlyWaterKgal: doublePrecision("avg_monthly_water_kgal"),
  avgMonthlyElectricKwh: doublePrecision("avg_monthly_electric_kwh"),
  avgMonthlyGasTherms: doublePrecision("avg_monthly_gas_therms"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type PropertyResponse = Property;

export interface PropertyQueryParams {
  minValue?: number;
  maxValue?: number;
  year?: number;
}
