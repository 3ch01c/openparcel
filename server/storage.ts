import { db } from "./db";
import {
  properties,
  type InsertProperty,
  type Property,
  type PropertyQueryParams
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
}

export const storage = new DatabaseStorage();
