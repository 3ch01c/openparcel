import { db } from "./db";
import {
  properties,
  utilityReadings,
  type InsertProperty,
  type Property,
  type PropertyQueryParams,
  type InsertUtilityReading,
  type UtilityReading
} from "@shared/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  getProperties(params?: PropertyQueryParams): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  clearAllProperties(): Promise<void>;
  updatePropertyWaterUsage(parcelId: string, avgMonthlyWaterKgal: number): Promise<void>;
  updatePropertyElectricUsage(parcelId: string, avgMonthlyElectricKwh: number): Promise<void>;
  updatePropertyGasUsage(parcelId: string, avgMonthlyGasTherms: number): Promise<void>;
  clearUtilityData(): Promise<void>;
  insertUtilityReadings(readings: InsertUtilityReading[]): Promise<void>;
  clearUtilityReadings(): Promise<void>;
  getUtilityReadings(): Promise<UtilityReading[]>;
}

export class DatabaseStorage implements IStorage {
  async getProperties(params?: PropertyQueryParams): Promise<Property[]> {
    const filters = [];
    
    if (params?.minValue) {
      filters.push(gte(properties.assessedValue, params.minValue));
    }
    
    if (params?.maxValue) {
      filters.push(lte(properties.assessedValue, params.maxValue));
    }
    
    if (params?.year) {
      filters.push(eq(properties.assessmentYear, params.year));
    }

    if (filters.length === 0) {
      return await db.select().from(properties);
    }

    return await db.select().from(properties).where(and(...filters));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db.insert(properties).values(insertProperty).returning();
    return property;
  }

  async clearAllProperties(): Promise<void> {
    await db.delete(properties);
  }

  async updatePropertyWaterUsage(parcelId: string, avgMonthlyWaterKgal: number): Promise<void> {
    await db.update(properties)
      .set({ avgMonthlyWaterKgal })
      .where(eq(properties.parcelId, parcelId));
  }

  async updatePropertyElectricUsage(parcelId: string, avgMonthlyElectricKwh: number): Promise<void> {
    await db.update(properties)
      .set({ avgMonthlyElectricKwh })
      .where(eq(properties.parcelId, parcelId));
  }

  async updatePropertyGasUsage(parcelId: string, avgMonthlyGasTherms: number): Promise<void> {
    await db.update(properties)
      .set({ avgMonthlyGasTherms })
      .where(eq(properties.parcelId, parcelId));
  }

  async clearUtilityData(): Promise<void> {
    await db.update(properties).set({ 
      avgMonthlyWaterKgal: null,
      avgMonthlyElectricKwh: null,
      avgMonthlyGasTherms: null
    });
  }

  async insertUtilityReadings(readings: InsertUtilityReading[]): Promise<void> {
    if (readings.length === 0) return;
    // Insert in batches of 1000 to avoid query size limits
    const batchSize = 1000;
    for (let i = 0; i < readings.length; i += batchSize) {
      const batch = readings.slice(i, i + batchSize);
      await db.insert(utilityReadings).values(batch);
    }
  }

  async clearUtilityReadings(): Promise<void> {
    await db.delete(utilityReadings);
  }

  async getUtilityReadings(): Promise<UtilityReading[]> {
    return await db.select().from(utilityReadings);
  }
}

export const storage = new DatabaseStorage();
