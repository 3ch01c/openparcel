import axios from "axios";
import { storage } from "./storage";
import type { InsertProperty } from "@shared/schema";

const ARCGIS_URL = "https://gis.losalamosnm.us/securegis/rest/services/parcelviewer/ParcelViewerBaseLayers_AGOL/MapServer/2/query";

const BATCH_SIZE = 1000;
const DELAY_MS = 500;

interface ArcGISFeature {
  attributes: Record<string, any>;
  geometry?: {
    rings?: number[][][];
  };
}

interface ArcGISResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: {
    code: number;
    message: string;
  };
}

function calculateCentroid(rings: number[][][]): { lat: number; lng: number } | null {
  if (!rings || rings.length === 0) return null;
  
  const outerRing = rings[0];
  if (!outerRing || outerRing.length === 0) return null;
  
  let sumLng = 0;
  let sumLat = 0;
  const count = outerRing.length;
  
  for (const [lng, lat] of outerRing) {
    sumLng += lng;
    sumLat += lat;
  }
  
  return {
    lat: count > 0 ? sumLat / count : 0,
    lng: count > 0 ? sumLng / count : 0
  };
}

async function fetchBatch(offset: number): Promise<{ features: ArcGISFeature[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    returnGeometry: "true",
    outFields: [
      "LAC_GIS.LACGIS.Parcels.OBJECTID",
      "LAC_GIS.LACGIS.Parcels.PIN",
      "LAC_GIS.LACGIS.Parcels.ADDRESS",
      "LAC_GIS.LACGIS.Parcels.ACCT",
      "LAC_GIS.LACGIS.Parcels.LEGAL",
      "LAC_GIS.LACGIS.Parcels.ACCT_TYPE",
      "LAC_GIS.LACGIS.Parcels.OWNER",
      "LAC_GIS.LACGIS.Parcels.ZONE",
      "LAC_GIS.LACGIS.Parcels.SUBDIV",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERNAME",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_ADDRESS1",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_CITY",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_STATE",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_ZIP",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BUILDING_ACTUAL",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LAND_ACTUAL",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TOTAL_ACTUAL",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BUILDING_TAXABLE",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LAND_TAXABLE",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TOTAL_TAXABLE",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.HHEXEMPTION",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.VETEXEMPTION",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TAXYEAR",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LANDSQFT",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BLDGSQFT",
      "LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TAXAREALEVY"
    ].join(","),
    outSR: "4326",
    resultOffset: offset.toString(),
    resultRecordCount: BATCH_SIZE.toString(),
    orderByFields: "LAC_GIS.LACGIS.Parcels.OBJECTID ASC"
  });

  const url = `${ARCGIS_URL}?${params.toString()}`;
  
  try {
    const response = await axios.get<ArcGISResponse>(url, {
      timeout: 60000,
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });
    
    if (response.data.error) {
      throw new Error(`ArcGIS error: ${response.data.error.message}`);
    }
    
    const features = response.data.features || [];
    const hasMore = response.data.exceededTransferLimit ?? features.length === BATCH_SIZE;
    
    return { features, hasMore };
  } catch (error) {
    console.error(`Error fetching batch at offset ${offset}:`, error);
    return { features: [], hasMore: false };
  }
}

function parseFeature(feature: ArcGISFeature): InsertProperty | null {
  const attrs = feature.attributes;
  
  const centroid = feature.geometry?.rings 
    ? calculateCentroid(feature.geometry.rings)
    : null;
  
  if (!centroid) return null;
  
  const upc = attrs["LAC_GIS.LACGIS.Parcels.PIN"] || attrs["LAC_GIS.LACGIS.Parcels.OBJECTID"]?.toString();
  const address = attrs["LAC_GIS.LACGIS.Parcels.ADDRESS"] || "Unknown";
  const mapid = attrs["LAC_GIS.LACGIS.Parcels.ACCT"] || null;
  const legaldesc = attrs["LAC_GIS.LACGIS.Parcels.LEGAL"] || null;
  const ownerType = attrs["LAC_GIS.LACGIS.Parcels.OWNER"] || null;
  const zone = attrs["LAC_GIS.LACGIS.Parcels.ZONE"] || null;
  const subdivision = attrs["LAC_GIS.LACGIS.Parcels.SUBDIV"] || null;
  const accountType = attrs["LAC_GIS.LACGIS.Parcels.ACCT_TYPE"] || null;
  
  const owner = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERNAME"] || "Unknown";
  const ownerAddress1 = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_ADDRESS1"] || null;
  const ownerCity = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_CITY"] || null;
  const ownerState = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_STATE"] || null;
  const ownerZip = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.OWNERADDRESS_ZIP"] || null;
  
  const buildingValue = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BUILDING_ACTUAL"] || 0;
  const landValue = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LAND_ACTUAL"] || 0;
  const totalValue = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TOTAL_ACTUAL"] || buildingValue + landValue;
  const buildingTaxable = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BUILDING_TAXABLE"] || 0;
  const landTaxable = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LAND_TAXABLE"] || 0;
  const totalTaxable = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TOTAL_TAXABLE"] || 0;
  const hhExemption = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.HHEXEMPTION"] || 0;
  const vetExemption = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.VETEXEMPTION"] || 0;
  const taxYear = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TAXYEAR"] || 2025;
  const landSqFt = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.LANDSQFT"] || 0;
  const buildingSqFt = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.BLDGSQFT"] || 0;
  const millLevy = attrs["LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.TAXAREALEVY"] || null;
  
  const area = landSqFt / 43560;
  
  return {
    upc: upc?.toString() || "UNKNOWN",
    address,
    owner,
    assessedValue: totalValue,
    lat: centroid.lat,
    lng: centroid.lng,
    assessmentYear: taxYear,
    area,
    landValue,
    improvementValue: buildingValue,
    landTaxable,
    buildingTaxable,
    totalTaxable,
    hhExemption,
    vetExemption,
    landSqft: landSqFt,
    buildingSqft: buildingSqFt,
    millLevy,
    accountType,
    mapid,
    legaldesc,
    ownerType,
    zone,
    subdivision,
    ownerAddress1,
    ownerCity,
    ownerState,
    ownerZip,
    geometry: feature.geometry?.rings ? JSON.stringify(feature.geometry.rings) : null
  };
}

export async function fetchArcGISData(): Promise<number> {
  console.log("Starting property data fetch from ArcGIS...");
  
  let offset = 0;
  let totalFetched = 0;
  let hasMore = true;
  
  while (hasMore) {
    console.log(`Fetching batch at offset ${offset}...`);
    
    const { features, hasMore: more } = await fetchBatch(offset);
    hasMore = more && features.length > 0;
    
    if (features.length === 0) {
      console.log("No more features to fetch.");
      break;
    }
    
    console.log(`Processing ${features.length} features...`);
    
    let batchInserted = 0;
    for (const feature of features) {
      const property = parseFeature(feature);
      if (property) {
        try {
          await storage.createProperty(property);
          batchInserted++;
        } catch (err) {
        }
      }
    }
    
    totalFetched += batchInserted;
    console.log(`Batch complete. Inserted ${batchInserted} properties. Total: ${totalFetched}`);
    
    offset += BATCH_SIZE;
    
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.log(`Data fetch complete. Total properties loaded: ${totalFetched}`);
  return totalFetched;
}

export async function getTotalParcelCount(): Promise<number> {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    returnIdsOnly: "true",
    returnCountOnly: "true"
  });
  
  try {
    const response = await axios.get(`${ARCGIS_URL}?${params.toString()}`, {
      timeout: 30000
    });
    return response.data.count || 0;
  } catch (error) {
    console.error("Error getting parcel count:", error);
    return 0;
  }
}
