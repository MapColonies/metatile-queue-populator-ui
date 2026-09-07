# Metatile Queue Populator UI & BFF 🗺️⚡

[![CI](https://github.com/MapColonies/metatile-queue-populator-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/MapColonies/metatile-queue-populator-ui/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/MapColonies/metatile-queue-populator-ui)](https://github.com/MapColonies/metatile-queue-populator-ui/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

An enterprise spatial tile management and queue population platform built for **MapColonies**. The platform provides an interactive GIS workbench for delineating geographical areas, estimating tile generation counts, previewing raster catalog layers via CSW/WMTS, and dispatching rendering jobs to distributed `pg-boss` queues.

---

## 🚀 Key Features

- **Interactive GIS Canvas & Drawing Tools (OpenLayers 10)**:
  - Draw Bounding Boxes (`BBOX`) and Polygons with coordinate snapping and closure.
  - Real-time high-precision coordinate tracking (8 decimal places).
  - Feature right-click context menu: copy geometries directly to clipboard as **WKT**, **GeoJSON**, or **KML**.
- **Multi-Format Spatial Converter (`POST /spatial/convert`)**:
  - Drag-and-drop or paste zipped Shapefiles (`.zip`), KML, WKT, and GeoJSON with automatic viewport zooming.
- **MapColonies Raster Catalog & WMTS Serving**:
  - Live CSW 2.0.2 catalog drawer with pagination and product type filters (`Orthophoto`, `RasterVector`, `RasterRelief`, `RasterElevation`).
  - Dynamic WMTS layer injection, opacity sliders, visibility toggling, and layer z-index reordering.
- **Resilient Non-Blocking Tile Estimation**:
  - Spatial intersection calculations executed in background `worker_threads` with AABB bounding-box spatial indexing.
  - Hard 30-second timeout guard preventing event-loop starvation.
  - Live dynamic `BFF Connected` / `BFF Connection Error` polling chip.
- **PostgreSQL Persistence & Management**:
  - Global pre-seeded hierarchical presets (Continent $\rightarrow$ Sub-region $\rightarrow$ Country + Middle East FeatureCollection).
  - Persistent Job Submission History with 1-click job replay.
  - Full system audit logging.
- **Real-time Queue Dashboard**:
  - Live monitoring of `pg-boss` active, queued, failed, and completed metatile jobs.
- **Cloud-Native & OpenShift Ready**:
  - Multi-stage unprivileged containers compliant with OpenShift restricted SCC.
  - Unified Helm chart with Nginx reverse proxy and OpenShift TLS Route exposure.

---

## 🏗️ Architecture

```
metatile-queue-populator-ui/
├── apps/
│   ├── ui/       # React 18 + Vite + Material-UI + OpenLayers 10 SPA
│   └── server/   # Node.js 22 + Express + TypeORM + pg-boss + Tile-Calc BFF
├── helm/         # Unified OpenShift Helm Chart
├── docs/         # Architecture Decision Records (ADRs)
└── ARCHITECTURE.md
```

For detailed architectural diagrams and design decisions, see [ARCHITECTURE.md](./ARCHITECTURE.md) and [docs/adr/](./docs/adr/).

---

## 💻 Local Development

### Prerequisites

- **Node.js**: `v22.x` or higher
- **pnpm**: `v11.x` or higher (`corepack enable && corepack prepare pnpm@11.22.0 --activate`)
- **Docker** (for local PostgreSQL)

### 1. Start Local Database

```bash
docker run -d --name metatile-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=metatile-queue-populator-ui \
  -p 5432:5432 \
  postgres:15-alpine
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Local Configuration

Create `apps/server/config/local.json` (git-ignored) with your local database and cluster endpoints:

```json
{
  "populator": {
    "url": "http://localhost:8081"
  },
  "appDb": {
    "host": "localhost",
    "port": 5432,
    "username": "postgres",
    "password": "postgres",
    "database": "metatile-queue-populator-ui"
  },
  "raster": {
    "cswUrl": "https://catalog.mapcolonies.net/api/raster/v1/csw",
    "token": ""
  }
}
```

### 4. Start Development Servers

```bash
# Start backend BFF (port 8080) and frontend UI (port 3000) concurrently
pnpm dev
```

- **Frontend UI**: [http://localhost:3000](http://localhost:3000)
- **BFF API & Swagger Docs**: [http://localhost:8080/docs](http://localhost:8080/docs)

---

## 🧪 Testing & Code Quality

```bash
# Run all unit and integration tests across the monorepo
pnpm test

# Check code formatting (Prettier)
pnpm format

# Lint server and validate OpenAPI 3.0 specification
pnpm --filter @metatile-queue-populator-ui/server lint
pnpm --filter @metatile-queue-populator-ui/server lint:openapi

# Build all packages for production
pnpm build
```

---

## ☸️ OpenShift Deployment (Helm)

### Deploy via Helm:

```bash
helm upgrade --install metatile-queue-populator-ui ./helm/metatile-queue-populator-ui \
  --namespace <your-namespace> \
  --set secrets.rasterToken="<your-csw-jwt-token>" \
  --set secrets.dbPassword="<postgres-password>" \
  --set secrets.appDbPassword="<postgres-password>" \
  --set route.host="metatile-populator.apps.your-cluster.com"
```

### PostgreSQL SSL / Certificate (mTLS) Authentication:

Both `appDb` (TypeORM) and `db` (pg-boss) support independent password or certificate (mTLS) authentication. To mount certificates from a Kubernetes Secret:

```bash
helm upgrade --install metatile-queue-populator-ui ./helm/metatile-queue-populator-ui \
  --namespace <your-namespace> \
  --set backend.env.appDb.ssl.enabled=true \
  --set backend.env.appDb.ssl.secretName="app-db-certs" \
  --set backend.env.appDb.ssl.caPath="/etc/pki/app-db/ca.crt" \
  --set backend.env.appDb.ssl.certPath="/etc/pki/app-db/client.crt" \
  --set backend.env.appDb.ssl.keyPath="/etc/pki/app-db/client.key" \
  --set backend.env.db.ssl.enabled=true \
  --set backend.env.db.ssl.secretName="db-certs" \
  --set backend.env.db.ssl.caPath="/etc/pki/db/ca.crt" \
  --set backend.env.db.ssl.certPath="/etc/pki/db/client.crt" \
  --set backend.env.db.ssl.keyPath="/etc/pki/db/client.key"
```

---

## 📄 License

This project is licensed under the MapColonies Open Source License.
