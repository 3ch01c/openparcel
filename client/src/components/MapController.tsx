import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { PropertyResponse } from "@shared/schema";

import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface HeatmapLayerProps {
  points: PropertyResponse[];
}

export function HeatmapLayer({ points }: HeatmapLayerProps) {
  const map = useMap();
  const heatLayerRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Check if map container is properly sized
  const checkMapReady = useCallback(() => {
    if (!map) return false;
    const container = map.getContainer();
    if (!container) return false;
    const size = map.getSize();
    return size.x > 0 && size.y > 0;
  }, [map]);

  // Wait for map to be ready with proper size
  useEffect(() => {
    if (!map) return;

    const waitForMap = () => {
      if (checkMapReady()) {
        setIsMapReady(true);
      } else {
        setTimeout(waitForMap, 100);
      }
    };

    // Initial check after a small delay
    const timer = setTimeout(waitForMap, 200);

    // Also listen for resize events
    const onResize = () => {
      if (checkMapReady()) {
        setIsMapReady(true);
        if (heatLayerRef.current) {
          try {
            heatLayerRef.current.redraw();
          } catch (e) {
            // Silently ignore redraw errors
          }
        }
      }
    };

    map.on('resize', onResize);
    map.on('zoomend', onResize);
    map.on('moveend', onResize);

    return () => {
      clearTimeout(timer);
      map.off('resize', onResize);
      map.off('zoomend', onResize);
      map.off('moveend', onResize);
    };
  }, [map, checkMapReady]);

  // Create/update heatmap layer when ready
  useEffect(() => {
    if (!map || !isMapReady || !points || points.length === 0) return;

    // Validate points
    const validPoints = points.filter(p => 
      p.lat && p.lng && 
      !isNaN(p.lat) && !isNaN(p.lng) &&
      p.lat >= -90 && p.lat <= 90 &&
      p.lng >= -180 && p.lng <= 180
    );

    if (validPoints.length === 0) return;

    // Clean up existing layer
    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch (e) {
        // Ignore removal errors
      }
      heatLayerRef.current = null;
    }

    // Prepare heat data with normalized intensity
    const maxVal = Math.max(...validPoints.map((p) => p.assessedValue || 1));
    const heatPoints: [number, number, number][] = validPoints.map((p) => [
      p.lat, 
      p.lng, 
      Math.max(0.15, (p.assessedValue || 0) / maxVal)
    ]);

    // Create heatmap with error handling
    try {
      // @ts-ignore
      const heat = L.heatLayer(heatPoints, {
        radius: 18,
        blur: 12,
        maxZoom: 17,
        minOpacity: 0.5,
        max: 1.0,
        gradient: {
          0.2: '#2c7bb6',
          0.4: '#00a6ca',
          0.6: '#00ccbc',
          0.8: '#90eb9d',
          1.0: '#ffff8c'
        }
      });

      // Add to map
      heat.addTo(map);
      heatLayerRef.current = heat;
    } catch (error) {
      // Log but don't throw - the map will still work
      console.warn("Heatmap initialization delayed, will retry...");
      
      // Retry after a delay
      const retryTimer = setTimeout(() => {
        if (checkMapReady() && !heatLayerRef.current) {
          try {
            // @ts-ignore
            const heat = L.heatLayer(heatPoints, {
              radius: 18,
              blur: 12,
              maxZoom: 17,
              minOpacity: 0.5,
              max: 1.0,
              gradient: {
                0.2: '#2c7bb6',
                0.4: '#00a6ca',
                0.6: '#00ccbc',
                0.8: '#90eb9d',
                1.0: '#ffff8c'
              }
            });
            heat.addTo(map);
            heatLayerRef.current = heat;
          } catch (e) {
            console.warn("Heatmap retry failed");
          }
        }
      }, 500);

      return () => clearTimeout(retryTimer);
    }

    return () => {
      if (heatLayerRef.current) {
        try {
          map.removeLayer(heatLayerRef.current);
        } catch (e) {
          // Ignore cleanup errors
        }
        heatLayerRef.current = null;
      }
    };
  }, [map, isMapReady, points, checkMapReady]);

  return null;
}

export function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}
