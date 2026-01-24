import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

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

  // Seed data endpoint (internal use or run once on startup)
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getProperties();
  if (existing.length > 0) return;

  console.log("Seeding database with Los Alamos property data...");
  
  // Los Alamos approximate bounds
  // Center: 35.8800, -106.3000
  // Spread: +/- 0.04 lat, +/- 0.05 lng
  const centerLat = 35.8800;
  const centerLng = -106.3000;
  
  const streets = ["Trinity Dr", "Central Ave", "Diamond Dr", "Canyon Rd", "Oppenheimer Dr", "Pajarito Rd"];
  const owners = ["Doe, John", "Smith, Jane", "Los Alamos National Lab", "County of Los Alamos", "Martinez, Robert", "Chen, Lisa"];
  
  const properties = [];
  
  // Generate 200 random properties
  for (let i = 0; i < 200; i++) {
    // Random coordinate generation with some clustering
    // Creating a "hotspot" near the center (higher values)
    const latOffset = (Math.random() - 0.5) * 0.06;
    const lngOffset = (Math.random() - 0.5) * 0.08;
    
    // Values higher near the center
    const distFromCenter = Math.sqrt(latOffset*latOffset + lngOffset*lngOffset);
    const baseValue = 500000;
    const valueMultiplier = 1 / (distFromCenter * 10 + 0.5); 
    const randomValue = Math.floor(baseValue * valueMultiplier * (0.8 + Math.random() * 0.4));
    
    // Cap realism
    const assessedValue = Math.min(Math.max(randomValue, 150000), 2000000);

    properties.push({
      parcelId: `LA-${2024}-${1000 + i}`,
      address: `${Math.floor(Math.random() * 5000) + 1} ${streets[Math.floor(Math.random() * streets.length)]}`,
      owner: owners[Math.floor(Math.random() * owners.length)],
      assessedValue,
      lat: centerLat + latOffset,
      lng: centerLng + lngOffset,
      assessmentYear: 2024
    });
  }

  for (const prop of properties) {
    await storage.createProperty(prop);
  }
  
  console.log("Seeding complete.");
}
