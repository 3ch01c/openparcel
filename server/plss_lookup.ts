import axios from "axios";
import { db } from "./db";
import { properties } from "@shared/schema";
import { eq, isNull, and, or } from "drizzle-orm";

const BLM_BASE = "https://gis.blm.gov/arcgis/rest/services/Cadastral/BLM_Natl_PLSS_CadNSDI/MapServer";

interface PLSSSection {
  township: string;
  townshipDir: string;
  range: string;
  rangeDir: string;
  section: string;
  rings: number[][][];
}

function pointInPolygon(lat: number, lng: number, rings: number[][][]): boolean {
  for (const ring of rings) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

async function fetchAllSections(minLng: number, minLat: number, maxLng: number, maxLat: number): Promise<PLSSSection[]> {
  const sectionUrl = `${BLM_BASE}/2/query`;
  const townshipUrl = `${BLM_BASE}/1/query`;

  const pad = 0.01;
  const envelope = `${minLng - pad},${minLat - pad},${maxLng + pad},${maxLat + pad}`;

  const sectionResp = await axios.get(sectionUrl, {
    params: {
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "PLSSID,FRSTDIVNO,FRSTDIVLAB",
      returnGeometry: true,
      outSR: 4326,
      f: "json",
    },
    timeout: 60000,
  });

  const townshipResp = await axios.get(townshipUrl, {
    params: {
      geometry: envelope,
      geometryType: "esriGeometryEnvelope",
      inSR: 4326,
      spatialRel: "esriSpatialRelIntersects",
      outFields: "PLSSID,TWNSHPNO,TWNSHPDIR,RANGENO,RANGEDIR",
      returnGeometry: false,
      f: "json",
    },
    timeout: 60000,
  });

  const townshipMap = new Map<string, { township: string; townshipDir: string; range: string; rangeDir: string }>();
  for (const f of townshipResp.data.features || []) {
    const a = f.attributes;
    townshipMap.set(a.PLSSID, {
      township: a.TWNSHPNO?.replace(/^0+/, "") || "",
      townshipDir: a.TWNSHPDIR || "",
      range: a.RANGENO?.replace(/^0+/, "") || "",
      rangeDir: a.RANGEDIR || "",
    });
  }

  const sections: PLSSSection[] = [];
  for (const f of sectionResp.data.features || []) {
    const a = f.attributes;
    const twpId = a.PLSSID;
    const twp = townshipMap.get(twpId);
    if (!twp) continue;

    sections.push({
      ...twp,
      section: a.FRSTDIVNO?.replace(/^0+/, "") || a.FRSTDIVLAB || "",
      rings: f.geometry?.rings || [],
    });
  }

  return sections;
}

export async function populatePLSSData(): Promise<{ updated: number; skipped: number; errors: number }> {
  const parcelsNeedingPLSS = await db
    .select({ id: properties.id, lat: properties.lat, lng: properties.lng })
    .from(properties)
    .where(
      or(isNull(properties.township), isNull(properties.section))
    );

  if (parcelsNeedingPLSS.length === 0) {
    console.log("[PLSS] All parcels already have PLSS data");
    return { updated: 0, skipped: 0, errors: 0 };
  }

  console.log(`[PLSS] ${parcelsNeedingPLSS.length} parcels need PLSS data, fetching sections from BLM...`);

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const p of parcelsNeedingPLSS) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  let sections: PLSSSection[];
  try {
    sections = await fetchAllSections(minLng, minLat, maxLng, maxLat);
    console.log(`[PLSS] Fetched ${sections.length} PLSS sections from BLM`);
  } catch (err: any) {
    console.error(`[PLSS] Failed to fetch sections from BLM: ${err.message}`);
    return { updated: 0, skipped: 0, errors: parcelsNeedingPLSS.length };
  }

  if (sections.length === 0) {
    console.error("[PLSS] No sections returned from BLM API");
    return { updated: 0, skipped: parcelsNeedingPLSS.length, errors: 0 };
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  const batchSize = 100;
  for (let i = 0; i < parcelsNeedingPLSS.length; i += batchSize) {
    const batch = parcelsNeedingPLSS.slice(i, i + batchSize);
    const promises = batch.map(async (parcel) => {
      try {
        const match = sections.find((s) => pointInPolygon(parcel.lat, parcel.lng, s.rings));
        if (match) {
          await db
            .update(properties)
            .set({
              township: match.township,
              townshipDir: match.townshipDir,
              range: match.range,
              rangeDir: match.rangeDir,
              section: match.section,
            })
            .where(eq(properties.id, parcel.id));
          updated++;
        } else {
          skipped++;
        }
      } catch (err: any) {
        errors++;
      }
    });
    await Promise.all(promises);

    if ((i + batchSize) % 1000 === 0 || i + batchSize >= parcelsNeedingPLSS.length) {
      console.log(`[PLSS] Progress: ${Math.min(i + batchSize, parcelsNeedingPLSS.length)}/${parcelsNeedingPLSS.length} (${updated} updated, ${skipped} skipped)`);
    }
  }

  console.log(`[PLSS] Complete: ${updated} updated, ${skipped} skipped, ${errors} errors`);
  return { updated, skipped, errors };
}
