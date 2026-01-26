import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { fetchArcGISData } from "./fetch_data";

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
