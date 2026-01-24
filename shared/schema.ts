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
