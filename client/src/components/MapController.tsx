import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { PropertyResponse } from "@shared/schema";

// Fix for default marker icons in Leaflet with React
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

  useEffect(() => {
    if (!points.length) return;

    // Transform points to [lat, lng, intensity] format
    // Normalize intensity based on max assessed value to create better gradients
    const maxVal = Math.max(...points.map((p) => p.assessedValue));
    const heatPoints = points.map((p) => [
      p.lat, 
      p.lng, 
      p.assessedValue / maxVal // Normalize 0-1
    ]);

    // @ts-ignore - leaflet.heat types are not perfect
    const heat = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.2: '#2c7bb6', // Deep Blue (Low)
        0.4: '#00a6ca', // Cyan
        0.6: '#00ccbc', // Teal
        0.8: '#90eb9d', // Green
        1.0: '#ffff8c'  // Yellow (High) - avoiding red to keep it clean
      }
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

export function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng]);
  }, [lat, lng, map]);
  return null;
}
