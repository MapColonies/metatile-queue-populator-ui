# ADR 0002: Unified OpenShift Helm Chart & Unprivileged Container Deployment

## Status
Accepted

## Context
The Metatile Queue Populator project is structured as a pnpm monorepo consisting of:
1. `@metatile-queue-populator-ui/ui`: React 18 Single Page Application (SPA) with Material-UI and OpenLayers 10.
2. `@metatile-queue-populator-ui/server`: Node.js / Express BFF service handling tile estimations, multi-format spatial conversions, PostgreSQL persistence, CSW/WMTS catalog routing, and `pg-boss` queue metrics.

We need to deploy this system onto MapColonies Red Hat OpenShift clusters with high availability, security (OpenShift restricted SCC compliance), seamless routing without CORS complications, and clean secret/credential isolation.

## Decisions

### 1. Unified Helm Chart Architecture (`helm/metatile-queue-populator-ui`)
A single, cohesive Helm chart will manage both frontend and backend deployments, services, configmaps, and OpenShift routes:
* **`frontend` values tree**: Controls Nginx replicas, resources, container images, and nginx config injection.
* **`backend` values tree**: Controls BFF server replicas, resources, telemetry, and database configuration.
* **External Database (`appDb` & `db`)**: Expects external PostgreSQL instances configured via OpenShift Secrets and ConfigMaps.

### 2. Single OpenShift TLS Edge Route & Nginx Reverse Proxy
To eliminate CORS and provide a unified DNS endpoint:
* A single OpenShift `Route` targets the `frontend` service on port 8080.
* Nginx serves static HTML/JS/CSS assets for root and UI routes (`/`, `/presets`, etc.) with `try_files` SPA routing.
* Nginx transparently proxies `/api/*` to the internal `backend` Kubernetes Service on port 8080 (`http://<backend-service>:8080/`), stripping the `/api` prefix to match BFF REST controllers.

### 3. OpenShift Hardened Unprivileged Containers
* **Backend (`Dockerfile.server`)**: Multi-stage build running Node.js 22 on Alpine with `dumb-init`, executed by unprivileged non-root user `node` (UID `1001`).
* **Frontend (`Dockerfile.ui`)**: Multi-stage build producing static assets via `pnpm build`, packaged on `nginxinc/nginx-unprivileged:alpine` listening on port `8080` with write permissions on `/tmp` and `/var/cache/nginx`.

## Consequences
* **Positive**:
  * Zero CORS friction between client and BFF in production.
  * Strict adherence to OpenShift `restricted-v1` security context constraints.
  * Standardized MapColonies Helm structure compatible with `mclabels` and Azure ACR / Harbor registries.
  * Secrets remain isolated in Kubernetes Secrets and are never stored in values files.
