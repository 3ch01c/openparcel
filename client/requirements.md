## Packages
leaflet | Core mapping library
react-leaflet | React components for Leaflet
leaflet.heat | Heatmap plugin for Leaflet (compatible with react-leaflet)
recharts | For statistical charts in the sidebar
lucide-react | Icons (already in base, but listing for confirmation)

## Notes
Tailwind Config - extend fontFamily:
fontFamily: {
  sans: ["Inter", "sans-serif"],
  display: ["Space Grotesk", "sans-serif"],
}

Map Implementation:
- Using standard OpenStreetMap tiles
- Implementing a custom heatmap layer component wrapping leaflet.heat
- Center coordinates for Los Alamos: [35.8800, -106.3000]
