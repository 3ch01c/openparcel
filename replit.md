# replit.md

## Overview

This is a Los Alamos property assessment visualization dashboard that displays real estate data on an interactive map with heatmap overlays. The application fetches property data from Los Alamos County ArcGIS services, stores it in PostgreSQL, and presents it through a React frontend with filtering capabilities and statistical charts.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom dark theme configuration
- **Mapping**: Leaflet with react-leaflet wrapper, leaflet.heat for heatmap visualization
- **Charts**: Recharts for statistical visualizations
- **Build Tool**: Vite with path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ES modules
- **API Design**: RESTful endpoints defined in shared/routes.ts with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Development**: tsx for TypeScript execution, Vite dev server with HMR

### Data Flow
1. Server fetches property data from Los Alamos ArcGIS REST API on startup
2. Data is stored in PostgreSQL using Drizzle ORM
3. Frontend queries /api/properties with optional filters (year, min/max value)
4. React Query caches responses for 5 minutes
5. Map displays properties as heatmap or individual markers

### Project Structure
- `client/` - React frontend application
- `server/` - Express backend with API routes and data fetching
- `shared/` - Shared types, schemas, and route definitions
- `migrations/` - Drizzle database migrations

### Key Design Decisions
- **Shared Schema**: Database schema and API types are shared between client and server via @shared alias
- **Type Safety**: End-to-end type safety using Zod for validation and drizzle-zod for schema generation
- **Dark Theme**: Premium dark color palette with CSS custom properties for theming
- **Responsive Design**: Mobile-first approach with use-mobile hook for breakpoint detection

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via DATABASE_URL environment variable
- **Drizzle ORM**: Database queries and schema management
- **connect-pg-simple**: Session storage (configured but may not be active)

### External APIs
- **Los Alamos ArcGIS REST Services**: Primary data source for property information
  - Endpoint: `https://gis.losalamosnm.us/securegis/rest/services/parcelviewer/ParcelViewerBaseLayers_AGOL/MapServer/2/query`
  - Layer 2 contains parcel data with assessment values joined from Eagle_PARCEL_2025_SUM table
  - Field prefixes: `LAC_GIS.LACGIS.Parcels.*` and `LAC_GIS.LACGIS.Eagle_PARCEL_2025_SUM.*`
  - Pagination: 1000 records per batch with resultOffset parameter
  - Data includes ~8,400 parcels covering Los Alamos and White Rock areas

### Map Services
- **OpenStreetMap**: Tile layer provider for base map imagery
- **Leaflet**: Core mapping library with react-leaflet bindings
- **leaflet.heat**: Heatmap visualization plugin

### Third-Party Libraries
- **axios**: HTTP client for ArcGIS API requests
- **Radix UI**: Headless UI primitives for accessible components
- **date-fns**: Date utility library
- **lucide-react**: Icon library