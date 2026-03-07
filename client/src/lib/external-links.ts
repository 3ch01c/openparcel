import type { PropertyResponse } from "@shared/schema";

export interface ExternalLink {
  label: string;
  urlTemplate: string;
}

const STORAGE_KEY = "openparcel-external-links";

const DEFAULT_LINKS: ExternalLink[] = [
  {
    label: "Zillow",
    urlTemplate: "https://www.zillow.com/homes/{address},-{ownerCity}-{ownerState}_rb/",
  },
  {
    label: "County Assessor",
    urlTemplate: "https://eagleweb.losalamosnm.us/assessor/taxweb/search.jsp",
  },
  {
    label: "County Clerk",
    urlTemplate: "https://eaglerecorderselfservice.losalamosnm.us/web/search/DOCSEARCH138S1",
  },
];

export function getExternalLinks(): ExternalLink[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_LINKS;
}

export function setExternalLinks(links: ExternalLink[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export function resetExternalLinks() {
  localStorage.removeItem(STORAGE_KEY);
}

export function resolveLink(template: string, property: PropertyResponse): string {
  const replacements: Record<string, string> = {
    address: property.address || "",
    owner: property.owner || "",
    upc: property.upc || "",
    mapid: property.mapid || "",
    ownerCity: property.ownerCity || "",
    ownerState: property.ownerState || "",
    ownerZip: property.ownerZip || "",
    zone: property.zone || "",
    subdivision: property.subdivision || "",
    legaldesc: property.legaldesc || "",
  };

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = replacements[key];
    return val !== undefined ? encodeURIComponent(val.trim()) : "";
  });
}

export function buildPopupLinksHtml(links: ExternalLink[], property: PropertyResponse): string {
  if (links.length === 0) return "";
  const anchors = links.map((link) => {
    const href = resolveLink(link.urlTemplate, property);
    return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="font-size: 11px; color: #3b82f6; text-decoration: none;">${link.label}</a>`;
  });
  return `<hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;"><div style="display: flex; gap: 8px; flex-wrap: wrap;">${anchors.join("")}</div>`;
}

export const AVAILABLE_PLACEHOLDERS = [
  { key: "address", description: "Property address" },
  { key: "owner", description: "Owner name" },
  { key: "upc", description: "UPC / PIN" },
  { key: "mapid", description: "Account / Map ID" },
  { key: "ownerCity", description: "Owner city" },
  { key: "ownerState", description: "Owner state" },
  { key: "ownerZip", description: "Owner ZIP" },
  { key: "zone", description: "Zoning" },
  { key: "subdivision", description: "Subdivision" },
  { key: "legaldesc", description: "Legal description" },
];
