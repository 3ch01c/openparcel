import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { fetchArcGISData } from "./fetch_data";
import multer from "multer";
import { parse } from "csv-parse/sync";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.properties.list.path, async (req, res) => {
    try {
      const params = api.properties.list.input?.parse(req.query);
      const properties = await storage.getProperties(params);
      res.json(properties);
    } catch (err) {
        if (err instanceof z.ZodError) {
          return res.status(400).json({
            message: err.errors[0].message,
            field: err.errors[0].path.join('.'),
          });
        }
        throw err;
    }
  });

  app.get(api.properties.get.path, async (req, res) => {
    const property = await storage.getProperty(Number(req.params.id));
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    res.json(property);
  });

  // Force refresh endpoint - clears and refetches all data
  app.post("/api/force-fetch", async (req, res) => {
    try {
      console.log("Force fetch requested - clearing database and refetching...");
      await storage.clearAllProperties();
      const count = await fetchArcGISData();
      res.json({ success: true, count, message: `Successfully fetched ${count} properties` });
    } catch (error) {
      console.error("Force fetch failed:", error);
      res.status(500).json({ success: false, message: "Failed to fetch data" });
    }
  });

  // Utility CSV upload endpoint - allow up to 50MB files
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });
  
  app.post("/api/upload-utility-csv", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString("utf-8");
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;

      // Group utility usage by service type, parcel ID and month
      // Structure: { parcelId: { "YYYY-MM": totalUsage } }
      const waterUsageByParcelMonth: Record<string, Record<string, number>> = {};
      const electricUsageByParcelMonth: Record<string, Record<string, number>> = {};
      const gasUsageByParcelMonth: Record<string, Record<string, number>> = {};

      for (const record of records) {
        const serviceCode = record["Service"] || record["SERVICE"] || record["service"];
        const parcelId = record["Parcel"] || record["PARCEL"] || record["parcel"] || record["PARCEL_ID"] || record["parcel_id"] || record["PIN"] || record["pin"];
        const usage = parseFloat(record["Actual Usage"] || record["ACTUAL USAGE"] || record["actual usage"] || record["USAGE"] || record["usage"] || record["Usage"] || "0");
        const billDateStr = record["Bill Date"] || record["BILL DATE"] || record["bill date"] || record["BillDate"] || "";

        if (!parcelId || isNaN(usage) || !billDateStr) continue;

        const billDate = new Date(billDateStr);
        if (isNaN(billDate.getTime())) continue;

        const monthKey = `${billDate.getFullYear()}-${String(billDate.getMonth() + 1).padStart(2, '0')}`;

        // Process by service type
        if (serviceCode === "10000") {
          // Electric (kWh)
          if (!electricUsageByParcelMonth[parcelId]) electricUsageByParcelMonth[parcelId] = {};
          if (!electricUsageByParcelMonth[parcelId][monthKey]) electricUsageByParcelMonth[parcelId][monthKey] = 0;
          electricUsageByParcelMonth[parcelId][monthKey] += usage;
        } else if (serviceCode === "20000") {
          // Gas (therms)
          if (!gasUsageByParcelMonth[parcelId]) gasUsageByParcelMonth[parcelId] = {};
          if (!gasUsageByParcelMonth[parcelId][monthKey]) gasUsageByParcelMonth[parcelId][monthKey] = 0;
          gasUsageByParcelMonth[parcelId][monthKey] += usage;
        } else if (serviceCode === "30000") {
          // Water (100s of gallons)
          if (!waterUsageByParcelMonth[parcelId]) waterUsageByParcelMonth[parcelId] = {};
          if (!waterUsageByParcelMonth[parcelId][monthKey]) waterUsageByParcelMonth[parcelId][monthKey] = 0;
          waterUsageByParcelMonth[parcelId][monthKey] += usage;
        }
      }

      // Clear all utility data before updating
      await storage.clearUtilityData();

      let waterCount = 0;
      let electricCount = 0;
      let gasCount = 0;

      // Calculate average monthly water usage in kgal (input is 100s of gallons, multiply by 0.1)
      for (const [parcelId, monthlyUsage] of Object.entries(waterUsageByParcelMonth)) {
        const months = Object.values(monthlyUsage);
        if (months.length > 0) {
          const totalUsage = months.reduce((a, b) => a + b, 0);
          const avgMonthlyUsage = totalUsage / months.length;
          const avgMonthlyWaterKgal = avgMonthlyUsage * 0.1;
          await storage.updatePropertyWaterUsage(parcelId, avgMonthlyWaterKgal);
          waterCount++;
        }
      }

      // Calculate average monthly electric usage in kWh
      for (const [parcelId, monthlyUsage] of Object.entries(electricUsageByParcelMonth)) {
        const months = Object.values(monthlyUsage);
        if (months.length > 0) {
          const totalUsage = months.reduce((a, b) => a + b, 0);
          const avgMonthlyElectricKwh = totalUsage / months.length;
          await storage.updatePropertyElectricUsage(parcelId, avgMonthlyElectricKwh);
          electricCount++;
        }
      }

      // Calculate average monthly gas usage in therms
      for (const [parcelId, monthlyUsage] of Object.entries(gasUsageByParcelMonth)) {
        const months = Object.values(monthlyUsage);
        if (months.length > 0) {
          const totalUsage = months.reduce((a, b) => a + b, 0);
          const avgMonthlyGasTherms = totalUsage / months.length;
          await storage.updatePropertyGasUsage(parcelId, avgMonthlyGasTherms);
          gasCount++;
        }
      }

      const totalUpdated = waterCount + electricCount + gasCount;
      res.json({
        success: true,
        message: `Processed ${records.length} records. Updated ${waterCount} parcels with water, ${electricCount} with electric, ${gasCount} with gas data.`,
        parcelsUpdated: totalUpdated,
        waterParcels: waterCount,
        electricParcels: electricCount,
        gasParcels: gasCount,
        totalRecords: records.length,
      });
    } catch (error) {
      console.error("CSV upload failed:", error);
      res.status(500).json({ success: false, message: "Failed to process CSV file" });
    }
  });

  // Clear utility data endpoint
  app.post("/api/clear-utility-data", async (req, res) => {
    try {
      await storage.clearUtilityData();
      res.json({ success: true, message: "All utility data cleared (water, electric, gas)" });
    } catch (error) {
      console.error("Clear utility data failed:", error);
      res.status(500).json({ success: false, message: "Failed to clear utility data" });
    }
  });

  // Seed database on startup
  seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getProperties();
  
  // Check if we need to refetch - either empty DB or missing account types
  const needsRefetch = existing.length === 0 || 
    existing.filter(p => p.accountType && p.accountType.length > 0).length === 0;
  
  if (!needsRefetch) {
    console.log(`Database already contains ${existing.length} properties with account types.`);
    return;
  }

  if (existing.length > 0) {
    console.log(`Database has ${existing.length} properties but missing account types. Clearing and refetching...`);
    await storage.clearAllProperties();
  } else {
    console.log("Database empty, fetching Los Alamos property data from ArcGIS...");
  }
  
  try {
    const count = await fetchArcGISData();
    console.log(`Successfully loaded ${count} properties from Los Alamos ArcGIS.`);
  } catch (error) {
    console.error("Failed to fetch ArcGIS data:", error);
    console.log("Falling back to mock data generation...");
    await generateMockData();
  }
}

async function generateMockData() {
  const neighborhoods = [
    { name: "Downtown Los Alamos", lat: 35.8814, lng: -106.2989, radius: 0.015, avgValue: 450000, count: 100 },
    { name: "North Community", lat: 35.8950, lng: -106.2900, radius: 0.012, avgValue: 520000, count: 80 },
    { name: "Western Area", lat: 35.8780, lng: -106.3200, radius: 0.018, avgValue: 380000, count: 60 },
    { name: "White Rock", lat: 35.8280, lng: -106.2100, radius: 0.020, avgValue: 350000, count: 100 },
    { name: "Eastern Los Alamos", lat: 35.8850, lng: -106.2600, radius: 0.015, avgValue: 410000, count: 60 }
  ];

  const streets = [
    "Trinity Dr", "Central Ave", "Diamond Dr", "Canyon Rd", "Oppenheimer Dr", 
    "Pajarito Rd", "Deacon St", "North Rd", "Nectar St", "Orange St"
  ];
  
  const owners = [
    "Smith, John", "Johnson, Mary", "Williams, Robert", "Brown, Patricia", "Jones, Michael"
  ];

  let totalCreated = 0;
  
  for (const neighborhood of neighborhoods) {
    for (let i = 0; i < neighborhood.count; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * neighborhood.radius;
      const lat = neighborhood.lat + distance * Math.cos(angle);
      const lng = neighborhood.lng + distance * Math.sin(angle) * 1.3;
      
      const valueVariation = 0.6 + Math.random() * 0.8;
      const assessedValue = Math.round(neighborhood.avgValue * valueVariation);
      const landRatio = 0.25 + Math.random() * 0.25;
      const landValue = Math.round(assessedValue * landRatio);
      const improvementValue = assessedValue - landValue;
      
      const streetNum = Math.floor(Math.random() * 4900) + 100;
      const street = streets[Math.floor(Math.random() * streets.length)];
      const owner = owners[Math.floor(Math.random() * owners.length)];
      
      await storage.createProperty({
        parcelId: `LA-${neighborhood.name.substring(0, 2).toUpperCase()}-${String(totalCreated + 1).padStart(5, '0')}`,
        address: `${streetNum} ${street}`,
        owner,
        assessedValue,
        lat,
        lng,
        assessmentYear: 2025,
        parcelArea: 0.1 + Math.random() * 2,
        landValue,
        improvementValue
      });
      
      totalCreated++;
    }
  }
  
  console.log(`Generated ${totalCreated} mock properties as fallback.`);
}
