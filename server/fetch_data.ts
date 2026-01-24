import axios from "axios";
import { storage } from "./storage";

async function fetchArcGISData() {
  // Use the public ArcGIS Online hosted service as primary - it has standard field names
  const url = "https://services.arcgis.com/89S7Bf6Y8Y750C0C/arcgis/rest/services/Parcel_Viewer_Base_Layers/FeatureServer/3/query";
  const params = {
    where: "1=1",
    outFields: "PARCEL_ID,Situs_Address,Owner_Name,AssessedValue,AssessmentYear,ParcelArea,LandValue,ImprovementValue",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: 4000, 
    outSR: "4326" 
  };
  
  try {
    const response = await axios.get(url, { params });
    const features = response.data?.features;
    
    if (!features) {
      throw new Error(`ArcGIS Error: ${response.data?.error?.message || "No features returned"}`);
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

    // Standard field mapping
    const parcelId = attrs.PARCEL_ID || attrs.PARCELNUMBER || `REAL-${Math.random().toString(36).substr(2, 9)}`;
    const address = attrs.Situs_Address || "Unknown Address";
    const owner = attrs.Owner_Name || "Unknown Owner";
    const assessedValue = attrs.AssessedValue || 0;

    await storage.createProperty({
      parcelId,
      address,
      owner,
      assessedValue,
      lat: geom.y,
      lng: geom.x,
      assessmentYear: attrs.AssessmentYear || 2024,
      parcelArea: attrs.ParcelArea,
      landValue: attrs.LandValue || (assessedValue * 0.4),
      improvementValue: attrs.ImprovementValue || (assessedValue * 0.6)
    });
  }
  console.log("Data import complete.");
}

export { fetchArcGISData };
