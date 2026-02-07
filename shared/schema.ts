import { pgTable, text, serial, integer, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const utilityReadings = pgTable("utility_readings", {
  id: serial("id").primaryKey(),
  upc: text("upc").notNull(),
  billDate: date("bill_date").notNull(),
  serviceCode: integer("service_code").notNull(),
  actualUsage: doublePrecision("actual_usage").notNull(),
});

export const insertUtilityReadingSchema = createInsertSchema(utilityReadings).omit({ id: true });
export type UtilityReading = typeof utilityReadings.$inferSelect;
export type InsertUtilityReading = z.infer<typeof insertUtilityReadingSchema>;

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  upc: text("upc").notNull().unique(),
  address: text("address").notNull(),
  owner: text("owner").notNull(),
  assessedValue: doublePrecision("assessed_value").notNull(),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  assessmentYear: integer("assessment_year").notNull(),
  area: doublePrecision("area"),
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
  mapid: text("mapid"),
  legaldesc: text("legaldesc"),
  ownerType: text("owner_type"),
  zone: text("zone"),
  subdivision: text("subdivision"),
  ownerAddress1: text("owner_address1"),
  ownerCity: text("owner_city"),
  ownerState: text("owner_state"),
  ownerZip: text("owner_zip"),
  geometry: text("geometry"),
  perimeter: doublePrecision("perimeter"),
  lastupdate: text("lastupdate"),
  avgMonthlyWaterKgal: doublePrecision("avg_monthly_water_kgal"),
  avgMonthlyElectricKwh: doublePrecision("avg_monthly_electric_kwh"),
  avgMonthlyGasTherms: doublePrecision("avg_monthly_gas_therms"),
  township: text("township"),
  townshipdir: text("townshipdir"),
  range: text("range"),
  rangedir: text("rangedir"),
  section: text("section"),
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
