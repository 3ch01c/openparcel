import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { PropertyResponse } from "@shared/schema";
import { type ColorMetric, getMetricValue, getZoneColor, isCategoricalMetric } from "@/lib/map-metrics";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

export type MapViewMode = "cluster" | "polygon";

interface ClusterLayerProps {
  points: PropertyResponse[];
  onPropertyClick?: (property: PropertyResponse) => void;
  colorMetric?: ColorMetric;
}

interface PolygonLayerProps {
  points: PropertyResponse[];
  onPropertyClick?: (property: PropertyResponse) => void;
  colorMetric?: ColorMetric;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getMarkerColor(value: number, minValue: number, maxValue: number): string {
  // Viridis colorblind-safe palette (purple → teal → yellow)
  // Normalize value to 0-1 range based on min/max of filtered data
  const range = maxValue - minValue;
  const ratio = range > 0 ? (value - minValue) / range : 0;
  if (ratio < 0.2) return "#440154";
  if (ratio < 0.4) return "#3b528b";
  if (ratio < 0.6) return "#21918c";
  if (ratio < 0.8) return "#5ec962";
  return "#fde725";
}

export function ClusterLayer({ points, onPropertyClick, colorMetric = "landValuePerSqft" }: ClusterLayerProps) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const checkMapReady = useCallback(() => {
    if (!map) return false;
    const container = map.getContainer();
    if (!container) return false;
    const size = map.getSize();
    return size.x > 0 && size.y > 0;
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const waitForMap = () => {
      if (checkMapReady()) {
        setIsMapReady(true);
      } else {
        setTimeout(waitForMap, 100);
      }
    };

    const timer = setTimeout(waitForMap, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [map, checkMapReady]);

  useEffect(() => {
    if (!map || !isMapReady || !points || points.length === 0) return;

    const validPoints = points.filter(p => 
      p.lat && p.lng && 
      !isNaN(p.lat) && !isNaN(p.lng) &&
      p.lat >= -90 && p.lat <= 90 &&
      p.lng >= -180 && p.lng <= 180
    );

    if (validPoints.length === 0) return;

    if (clusterGroupRef.current) {
      try {
        map.removeLayer(clusterGroupRef.current);
      } catch (e) {
      }
      clusterGroupRef.current = null;
    }

    // For categorical metrics (zone), build a sorted list for consistent coloring
    const zoneList = isCategoricalMetric(colorMetric) 
      ? Array.from(new Set(validPoints.map(p => p.zone).filter(Boolean) as string[])).sort()
      : [];

    // Calculate min/max values for numeric metrics
    const metricValues = !isCategoricalMetric(colorMetric) 
      ? validPoints.map(p => getMetricValue(p, colorMetric))
      : [];
    const minMetricValue = metricValues.length > 0 ? Math.min(...metricValues) : 0;
    const maxMetricValue = metricValues.length > 0 ? Math.max(...metricValues) : 1;

    try {
      const clusterGroup = L.markerClusterGroup({
        chunkedLoading: true,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 18,
        iconCreateFunction: (cluster) => {
          const childCount = cluster.getChildCount();
          let dimensions = 30;
          
          if (childCount >= 100) {
            dimensions = 50;
          } else if (childCount >= 10) {
            dimensions = 40;
          }

          return L.divIcon({
            html: `<div style="
              background-color: #3b82f6;
              width: ${dimensions}px;
              height: ${dimensions}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: ${dimensions >= 50 ? 14 : dimensions >= 40 ? 12 : 11}px;
            ">${childCount}</div>`,
            className: "custom-cluster-icon",
            iconSize: L.point(dimensions, dimensions),
          });
        },
      });

      validPoints.forEach((property) => {
        const color = isCategoricalMetric(colorMetric)
          ? getZoneColor(property.zone, zoneList)
          : getMarkerColor(getMetricValue(property, colorMetric), minMetricValue, maxMetricValue);
        
        const markerIcon = L.divIcon({
          className: "custom-marker",
          html: `<div style="
            background-color: ${color};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6],
        });

        const marker = L.marker([property.lat, property.lng], { icon: markerIcon });

        const hhExemptAmount = (property.hhExemption || 0) * (property.millLevy || 28.714) / 1000;
        const vetExemptAmount = (property.vetExemption || 0) * (property.millLevy || 28.714) / 1000;
        const isExempt = property.accountType?.toUpperCase().includes("EXEMPT") || false;
        const taxExemptAmount = isExempt ? (property.totalTaxable || 0) * (property.millLevy || 28.714) / 1000 : 0;
        const taxAssessed = isExempt ? 0 : Math.max(0, (property.totalTaxable || 0) * (property.millLevy || 28.714) / 1000 - hhExemptAmount - vetExemptAmount);
        
        const parcelArea = property.parcelArea || 0;
        const landSqft = parcelArea * 43560;
        const buildingSqft = property.buildingSqft || 0;
        const landPerSqft = landSqft > 0 ? (property.landValue || 0) / landSqft : 0;
        const improvementPerSqft = buildingSqft > 0 ? (property.improvementValue || 0) / buildingSqft : 0;
        const taxPerSqft = landSqft > 0 ? taxAssessed / landSqft : 0;

        const ownerAddressParts = [
          property.ownerAddress1,
          property.ownerCity,
          property.ownerState,
          property.ownerZip
        ].filter(Boolean);
        const ownerAddress = ownerAddressParts.length > 0 
          ? `${property.ownerAddress1 || ""}${property.ownerAddress1 ? ", " : ""}${property.ownerCity || ""} ${property.ownerState || ""} ${property.ownerZip || ""}`.trim()
          : "N/A";

        const popupContent = `
          <div style="min-width: 250px; font-family: system-ui, sans-serif;">
            <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333;">${property.address || "Unknown Address"}</div>
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; column-gap: 5px; font-size: 12px;">
              <div style="color: #666;">Owner:</div>
              <div style="font-weight: 500;">${property.owner || "N/A"}</div>
              <div style="color: #666;">Owner Address:</div>
              <div style="font-weight: 500;">${ownerAddress}</div>
              <div style="color: #666;">Assessed Value:</div>
              <div style="font-weight: 500;">${formatCurrency(property.assessedValue)}</div>
              <div style="color: #666;">Land Value:</div>
              <div style="font-weight: 500;">${formatCurrency(property.landValue || 0)} <span style="color: #888;">($${landPerSqft.toFixed(2)}/sqft)</span></div>
              <div style="color: #666;">Improvement:</div>
              <div style="font-weight: 500;">${formatCurrency(property.improvementValue || 0)} <span style="color: #888;">($${improvementPerSqft.toFixed(2)}/sqft)</span></div>
              <div style="color: #666;">Tax Assessed:</div>
              <div style="font-weight: 500; color: #22c55e;">${formatCurrency(taxAssessed)} <span style="color: #888;">($${taxPerSqft.toFixed(4)}/sqft)</span></div>
              <div style="color: #666;">Parcel Area:</div>
              <div style="font-weight: 500;">${parcelArea.toFixed(2)} acres</div>
              <div style="color: #666;">Account Type:</div>
              <div style="font-weight: 500;">${property.accountType || "N/A"}</div>
              <div style="color: #666;">Subdivision:</div>
              <div style="font-weight: 500;">${property.subdiv || "N/A"}</div>
              <div style="color: #666;">Zone:</div>
              <div style="font-weight: 500;">${property.zone || "N/A"}</div>
              <div style="color: #666;">Mill Levy:</div>
              <div style="font-weight: 500;">${(property.millLevy || 28.714).toFixed(3)}</div>
            </div>
            ${(property.hhExemption || property.vetExemption || isExempt) ? `
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
              <div style="font-size: 11px; color: #888;">
                ${property.hhExemption ? `<div>HH Exemption: ${formatCurrency(hhExemptAmount)}</div>` : ""}
                ${property.vetExemption ? `<div>Vet Exemption: ${formatCurrency(vetExemptAmount)}</div>` : ""}
                ${isExempt ? `<div>Tax Exempt: ${formatCurrency(taxExemptAmount)}</div>` : ""}
              </div>
            ` : ""}
            <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="https://www.zillow.com/homes/${encodeURIComponent(property.address || "")},-Los-Alamos-NM_rb/" 
                 target="_blank" rel="noopener noreferrer"
                 style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                Zillow
              </a>
              <a href="https://eagleweb.losalamosnm.us/assessor/taxweb/search.jsp" 
                 target="_blank" rel="noopener noreferrer"
                 style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                County Assessor
              </a>
              <a href="https://eaglerecorderselfservice.losalamosnm.us/web/search/DOCSEARCH138S1" 
                 target="_blank" rel="noopener noreferrer"
                 style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                County Clerk
              </a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 300 });

        if (onPropertyClick) {
          marker.on("click", () => onPropertyClick(property));
        }

        clusterGroup.addLayer(marker);
      });

      clusterGroup.addTo(map);
      clusterGroupRef.current = clusterGroup;
    } catch (error) {
      console.warn("Cluster initialization error:", error);
    }

    return () => {
      if (clusterGroupRef.current) {
        try {
          map.removeLayer(clusterGroupRef.current);
        } catch (e) {
        }
        clusterGroupRef.current = null;
      }
    };
  }, [map, isMapReady, points, onPropertyClick, colorMetric]);

  return null;
}

export function PolygonLayer({ points, onPropertyClick, colorMetric = "landValuePerSqft" }: PolygonLayerProps) {
  const map = useMap();
  const polygonLayerRef = useRef<L.LayerGroup | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const checkMapReady = useCallback(() => {
    if (!map) return false;
    const container = map.getContainer();
    if (!container) return false;
    const size = map.getSize();
    return size.x > 0 && size.y > 0;
  }, [map]);

  useEffect(() => {
    if (!map) return;

    const waitForMap = () => {
      if (checkMapReady()) {
        setIsMapReady(true);
      } else {
        setTimeout(waitForMap, 100);
      }
    };

    const timer = setTimeout(waitForMap, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [map, checkMapReady]);

  useEffect(() => {
    if (!map || !isMapReady || !points || points.length === 0) return;

    const validPoints = points.filter(p => 
      p.lat && p.lng && 
      !isNaN(p.lat) && !isNaN(p.lng) &&
      p.lat >= -90 && p.lat <= 90 &&
      p.lng >= -180 && p.lng <= 180 &&
      p.geometry
    );

    if (validPoints.length === 0) return;

    if (polygonLayerRef.current) {
      try {
        map.removeLayer(polygonLayerRef.current);
      } catch (e) {
      }
      polygonLayerRef.current = null;
    }

    // For categorical metrics (zone), build a sorted list for consistent coloring
    const zoneList = isCategoricalMetric(colorMetric) 
      ? Array.from(new Set(validPoints.map(p => p.zone).filter(Boolean) as string[])).sort()
      : [];

    // Calculate min/max values for numeric metrics
    const metricValues = !isCategoricalMetric(colorMetric) 
      ? validPoints.map(p => getMetricValue(p, colorMetric))
      : [];
    const minMetricValue = metricValues.length > 0 ? Math.min(...metricValues) : 0;
    const maxMetricValue = metricValues.length > 0 ? Math.max(...metricValues) : 1;

    try {
      const layerGroup = L.layerGroup();

      validPoints.forEach((property) => {
        try {
          const rings: number[][][] = JSON.parse(property.geometry!);
          if (!rings || rings.length === 0) return;

          const latLngs = rings.map(ring => 
            ring.map(([lng, lat]) => [lat, lng] as [number, number])
          );

          const color = isCategoricalMetric(colorMetric)
            ? getZoneColor(property.zone, zoneList)
            : getMarkerColor(getMetricValue(property, colorMetric), minMetricValue, maxMetricValue);

          const polygon = L.polygon(latLngs, {
            color: color,
            weight: 1,
            opacity: 0.8,
            fillColor: color,
            fillOpacity: 0.4,
          });

          const hhExemptAmount = (property.hhExemption || 0) * (property.millLevy || 28.714) / 1000;
          const vetExemptAmount = (property.vetExemption || 0) * (property.millLevy || 28.714) / 1000;
          const isExempt = property.accountType?.toUpperCase().includes("EXEMPT") || false;
          const taxExemptAmount = isExempt ? (property.totalTaxable || 0) * (property.millLevy || 28.714) / 1000 : 0;
          const taxAssessed = isExempt ? 0 : Math.max(0, (property.totalTaxable || 0) * (property.millLevy || 28.714) / 1000 - hhExemptAmount - vetExemptAmount);
          
          const parcelArea = property.parcelArea || 0;
          const landSqft = parcelArea * 43560;
          const buildingSqft = property.buildingSqft || 0;
          const landPerSqft = landSqft > 0 ? (property.landValue || 0) / landSqft : 0;
          const improvementPerSqft = buildingSqft > 0 ? (property.improvementValue || 0) / buildingSqft : 0;
          const taxPerSqft = landSqft > 0 ? taxAssessed / landSqft : 0;

          const ownerAddressParts = [
            property.ownerAddress1,
            property.ownerCity,
            property.ownerState,
            property.ownerZip
          ].filter(Boolean);
          const ownerAddress = ownerAddressParts.length > 0 
            ? `${property.ownerAddress1 || ""}${property.ownerAddress1 ? ", " : ""}${property.ownerCity || ""} ${property.ownerState || ""} ${property.ownerZip || ""}`.trim()
            : "N/A";

          const popupContent = `
            <div style="min-width: 250px; font-family: system-ui, sans-serif;">
              <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px; color: #333;">${property.address || "Unknown Address"}</div>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px; column-gap: 5px; font-size: 12px;">
                <div style="color: #666;">Owner:</div>
                <div style="font-weight: 500;">${property.owner || "N/A"}</div>
                <div style="color: #666;">Owner Address:</div>
                <div style="font-weight: 500;">${ownerAddress}</div>
                <div style="color: #666;">Assessed Value:</div>
                <div style="font-weight: 500;">${formatCurrency(property.assessedValue)}</div>
                <div style="color: #666;">Land Value:</div>
                <div style="font-weight: 500;">${formatCurrency(property.landValue || 0)} <span style="color: #888;">($${landPerSqft.toFixed(2)}/sqft)</span></div>
                <div style="color: #666;">Improvement:</div>
                <div style="font-weight: 500;">${formatCurrency(property.improvementValue || 0)} <span style="color: #888;">($${improvementPerSqft.toFixed(2)}/sqft)</span></div>
                <div style="color: #666;">Tax Assessed:</div>
                <div style="font-weight: 500; color: #22c55e;">${formatCurrency(taxAssessed)} <span style="color: #888;">($${taxPerSqft.toFixed(4)}/sqft)</span></div>
                <div style="color: #666;">Parcel Area:</div>
                <div style="font-weight: 500;">${parcelArea.toFixed(2)} acres</div>
                <div style="color: #666;">Account Type:</div>
                <div style="font-weight: 500;">${property.accountType || "N/A"}</div>
                <div style="color: #666;">Subdivision:</div>
                <div style="font-weight: 500;">${property.subdiv || "N/A"}</div>
                <div style="color: #666;">Zone:</div>
                <div style="font-weight: 500;">${property.zone || "N/A"}</div>
                <div style="color: #666;">Mill Levy:</div>
                <div style="font-weight: 500;">${(property.millLevy || 28.714).toFixed(3)}</div>
              </div>
              ${(property.hhExemption || property.vetExemption || isExempt) ? `
                <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
                <div style="font-size: 11px; color: #888;">
                  ${property.hhExemption ? `<div>HH Exemption: ${formatCurrency(hhExemptAmount)}</div>` : ""}
                  ${property.vetExemption ? `<div>Vet Exemption: ${formatCurrency(vetExemptAmount)}</div>` : ""}
                  ${isExempt ? `<div>Tax Exempt: ${formatCurrency(taxExemptAmount)}</div>` : ""}
                </div>
              ` : ""}
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #eee;">
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <a href="https://www.zillow.com/homes/${encodeURIComponent(property.address || "")},-Los-Alamos-NM_rb/" 
                   target="_blank" rel="noopener noreferrer"
                   style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                  Zillow
                </a>
                <a href="https://eagleweb.losalamosnm.us/assessor/taxweb/search.jsp" 
                   target="_blank" rel="noopener noreferrer"
                   style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                  County Assessor
                </a>
                <a href="https://eaglerecorderselfservice.losalamosnm.us/web/search/DOCSEARCH138S1" 
                   target="_blank" rel="noopener noreferrer"
                   style="font-size: 11px; color: #3b82f6; text-decoration: none;">
                  County Clerk
                </a>
              </div>
            </div>
          `;

          polygon.bindPopup(popupContent, { maxWidth: 300 });

          if (onPropertyClick) {
            polygon.on("click", () => onPropertyClick(property));
          }

          layerGroup.addLayer(polygon);
        } catch (e) {
        }
      });

      layerGroup.addTo(map);
      polygonLayerRef.current = layerGroup;
    } catch (error) {
      console.warn("Polygon initialization error:", error);
    }

    return () => {
      if (polygonLayerRef.current) {
        try {
          map.removeLayer(polygonLayerRef.current);
        } catch (e) {
        }
        polygonLayerRef.current = null;
      }
    };
  }, [map, isMapReady, points, onPropertyClick, colorMetric]);

  return null;
}

export function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}
