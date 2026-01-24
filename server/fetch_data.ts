import axios from "axios";
import { storage } from "./storage";

async function fetchArcGISData() {
  // Primary Los Alamos ArcGIS REST endpoint
  const url = "https://gis.losalamosnm.us/arcgis/rest/services/parcelviewer/ParcelViewerBaseLayers/MapServer/3/query";
  const params = {
    where: "1=1",
    outFields: "PARCELNUMBER,SITUS_ADDRESS_HOUSENUMBER,SITUS_ADDRESS_STREETNAME,OWNER_NAME,LAND_ACTUAL,BUILDING_ACTUAL,TAXYEAR,LANDSQFT",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: 500, 
    outSR: "4326" 
  };
  
  try {
    const response = await axios.get(url, { params });
    const features = response.data?.features;
    
    if (!features) {
      console.log("Primary service failed or required token, trying ArcGIS Online fallback...");
      const agolUrl = "https://services.arcgis.com/89S7Bf6Y8Y750C0C/arcgis/rest/services/Parcel_Viewer_Base_Layers/FeatureServer/3/query";
      const agolResponse = await axios.get(agolUrl, { params });
      if (!agolResponse.data?.features) {
        throw new Error(`ArcGIS Error: ${agolResponse.data?.error?.message || "Unknown error"}`);
      }
      return processFeatures(agolResponse.data.features);
    }
    
    return processFeatures(features);
  } catch (error) {
    throw error;
  }
}

async function processFeatures(features: any[]) {
  console.log(`Processing ${features.length} property records...`);
  
  for (const feature of features) {
    const attrs = feature.attributes;
    const geom = feature.geometry;
    
    if (!geom || !geom.x || !geom.y) continue;

    // Field mapping for Los Alamos schema variants
    const parcelId = attrs.PARCELNUMBER || attrs.PARCEL_ID || `REAL-${Math.random().toString(36).substr(2, 9)}`;
    const address = attrs.SITUS_ADDRESS_HOUSENUMBER 
      ? `${attrs.SITUS_ADDRESS_HOUSENUMBER} ${attrs.SITUS_ADDRESS_STREETNAME}`.trim() 
      : (attrs.Situs_Address || "Unknown Address");
    const owner = attrs.OWNER_NAME || attrs.Owner_Name || "Unknown Owner";
    const landVal = attrs.LAND_ACTUAL || attrs.LandValue || 0;
    const impVal = attrs.BUILDING_ACTUAL || attrs.ImprovementValue || 0;
    const assessedValue = landVal + impVal || attrs.AssessedValue || 0;

    await storage.createProperty({
      parcelId,
      address,
      owner,
      assessedValue,
      lat: geom.y,
      lng: geom.x,
      assessmentYear: attrs.TAXYEAR || attrs.AssessmentYear || 2024,
      parcelArea: attrs.LANDSQFT || attrs.ParcelArea,
      landValue: landVal,
      improvementValue: impVal
    });
  }
  console.log("Data import complete.");
}

export { fetchArcGISData };
