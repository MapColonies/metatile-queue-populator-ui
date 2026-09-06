# Architecture & Design Overview

## 1. System Summary

**Metatile Queue Populator UI** is an end-to-end spatial processing management platform designed for MapColonies. It enables operators, GIS engineers, and automated workflows to interactively delineate geographical boundaries, estimate tile counts, browse and preview raster catalog layers, and populate rendering job queues for distributed tile generation.

```mermaid
flowchart TB
    subgraph Frontend ["Frontend (React 18 + Vite + OpenLayers 10 + MUI)"]
        UI[Metatile Queue Populator UI]
        Map[Interactive Map & Drawing Engine]
        CatalogDrawer[Raster Catalog CSW Drawer]
        Dropzone[Spatial File Dropzone]
        HistoryDashboard[History & Queue Dashboard]
    end

    subgraph BFF ["Backend For Frontend (Node.js / Express / TypeScript)"]
        Server[BFF API Gateway :8080]
        TilesRouter["/tiles (Estimate & Submit)"]
        SpatialRouter["/spatial (Multi-format Converter)"]
        PresetsRouter["/presets (CRUD & Bundles)"]
        QueueRouter["/queue (Metrics & Status)"]
        HistoryRouter["/history (Submissions & Replays)"]
        AuditRouter["/audit (Audit Logging)"]
        RasterRouter["/config/raster (CSW & Map Config)"]
        WorkerThreads["Worker Thread Pool (Spatial Tile Estimation)"]
    end

    subgraph Infrastructure ["Internal Infrastructure & Services"]
        PopulatorSvc["Metatile Queue Populator Service"]
        PGBoss["pg-boss Job Queue"]
        AppDB[("PostgreSQL Application Database")]
        CSW["MapColonies Raster Catalog CSW"]
        WMTS["MapColonies Raster WMTS Tile Service"]
    end

    UI --> Server
    Map --> WMTS
    CatalogDrawer --> CSW
    Server --> TilesRouter
    Server --> SpatialRouter
    Server --> PresetsRouter
    Server --> QueueRouter
    Server --> HistoryRouter
    Server --> AuditRouter
    Server --> RasterRouter

    TilesRouter --> WorkerThreads
    TilesRouter --> PopulatorSvc
    QueueRouter --> PGBoss
    HistoryRouter --> AppDB
    PresetsRouter --> AppDB
    AuditRouter --> AppDB

---

## 2. Core Architectural Pillars

### 2.1 Monorepo Workspace Structure (`pnpm`)
The project is organized as a unified, high-performance monorepo workspace:
* **`apps/ui`**: Client single-page application built on React 18, Vite, Material-UI (v6 Dark Theme), and OpenLayers 10.
* **`apps/server`**: BFF REST API built with Node.js 22, Express, TypeORM, `@map-colonies/tile-calc`, and `pg-boss`.
* **Root tooling**: Standardized TypeScript configurations (`tsconfig.base.json`), Prettier formatting, ESLint rules, and automated release tooling.

---

### 2.2 Interactive GIS & Spatial Processing Engine
1. **Interactive Geometry Vector Layer**:
   * OpenLayers 10 vector source supporting real-time BBOX and Polygon drawing with automatic closure and snapping.
   * Coordinate readouts formatted to 8 decimal places with coordinate copying.
   * Right-click context menu directly on canvas features providing immediate **WKT**, **GeoJSON**, and **KML** export to clipboard.
2. **Multi-format Spatial File Converter (`POST /spatial/convert`)**:
   * Accepts zipped Shapefiles (`.zip`), KML (`.kml`), WKT, and GeoJSON.
   * Converts diverse spatial formats into unified RFC 7946 GeoJSON representations with automatic bounding-box calculation and viewport auto-zoom fitting.
3. **MapColonies Raster Catalog & WMTS Overlay**:
   * Live CSW 2.0.2 catalog querying with product filters (`Orthophoto`, `RasterVector`, `RasterRelief`, `RasterElevation`).
   * Dynamic WMTS layer injection with GetCapabilities parsing, token injection, opacity adjustment, and z-index reordering.

---

### 2.3 Tile Calculation & Non-blocking Estimation Engine
* **AABB Pre-filtering & Boolean Intersection**: Evaluates spatial bounds using Axis-Aligned Bounding Boxes before evaluating complex polygon intersections via `@turf/boolean-intersects`.
* **Worker Threads Offloading (`worker_threads`)**: Spatial calculations and tile intersections are dispatched to background worker threads, preventing Node.js event-loop starvation and keeping health checks (`/liveness`, `/readiness`) responsive in $<10\text{ms}$.
* **Execution Timeout Guard**: Automatic 30-second cancellation safety terminating excessive background jobs and returning explicit HTTP 408 / 504 responses.

---

### 2.4 Persistence & Observability
* **PostgreSQL + TypeORM**:
  * **Global & Custom Presets**: Pre-seeded hierarchical world presets (Continent $\rightarrow$ Sub-region $\rightarrow$ Country + Middle East FeatureCollection) alongside user-defined bookmarks.
  * **Job Submission History**: Complete audit trail of queue submissions with 1-click replay functionality.
  * **Audit Log Trail**: Captures mutations, client IPs, payloads, and execution results.
* **Queue Monitoring & Health**:
  * Direct telemetry to `pg-boss` job queue checking active, queued, failed, and completed metatile jobs.
  * Dynamic real-time `BFF Connected` / `BFF Connection Error` polling indicator on the UI header.

---

## 3. Deployment & CI/CD
* **GitHub Actions (`.github/workflows/ci.yml`)**: Automated pipeline validating code formatting, ESLint, OpenAPI 3.0 specs, unit/integration test suites, and production package builds.
* **Release Please (`.github/workflows/release-please.yml`)**: Semantic release management, automated changelog generation, and tag creation.
```
