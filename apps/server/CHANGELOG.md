# Changelog

## [1.1.0](https://github.com/MapColonies/metatile-queue-populator-ui/compare/server-v1.0.0...server-v1.1.0) (2026-09-06)


### Features

* **audit:** setup PostgreSQL database persistence for audit logs and job submission history ([eb6d97b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/eb6d97bd85bd01256a9d3640f75f488093422a40))
* **deploy:** add OpenShift Helm chart, unprivileged Nginx and server Dockerfiles, and ADR 0002 ([5dee5a3](https://github.com/MapColonies/metatile-queue-populator-ui/commit/5dee5a33283e908ed6c5ad3a164c796bc06c105c))
* implement area form and BFF populator proxy for /tiles/area with Vitest tests ([7b980d2](https://github.com/MapColonies/metatile-queue-populator-ui/commit/7b980d2fe4aa7d3ac7c6703d4d66c0bd74423605))
* implement Job Submission History & 1-Click Replay in UI and BFF with Vitest tests ([c45e359](https://github.com/MapColonies/metatile-queue-populator-ui/commit/c45e35970d4708638177c9b7f2c36d965bba27bb))
* implement Presets & Area Bookmarks Manager in UI and BFF with Vitest tests ([0554e2b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/0554e2bfa372343764e4bc88d0562b64ae0a45ed))
* implement Queue Metrics endpoints and Real-time Queue Dashboard view with Vitest tests ([b442a9a](https://github.com/MapColonies/metatile-queue-populator-ui/commit/b442a9a80c4d6894d11f5e504e753d44b97f3faa))
* integrate MapColonies raster catalog, WMTS serving, multi-layer manager, and on-prem default map configuration ([9bb1248](https://github.com/MapColonies/metatile-queue-populator-ui/commit/9bb1248403de9f3c15d2bdf5ec49fa3e9fe83ad7))
* **presets:** add Middle East subregion FeatureCollection encompassing Iran to Turkey and Egypt ([742adf5](https://github.com/MapColonies/metatile-queue-populator-ui/commit/742adf587c54279995e385548bce50ae74cec870))
* **presets:** generate hierarchical presets (Continent -&gt; Subregion -&gt; Country) loaded on default startup ([4a6f971](https://github.com/MapColonies/metatile-queue-populator-ui/commit/4a6f971bd25bd600fe9387537be97a648c5d6a15))
* **server:** connect QueueStatusService to pg-boss & database config matching populator service ([0edabb8](https://github.com/MapColonies/metatile-queue-populator-ui/commit/0edabb8bafb4cd2077c1425cb91c577f80c6e5dd))
* **server:** implement SpatialConverter and POST /spatial/convert with Vitest tests ([7b2f05e](https://github.com/MapColonies/metatile-queue-populator-ui/commit/7b2f05e12e4fa152f77101db1e0691c872bbd6e5))
* **server:** implement TileEstimationService and POST /tiles/estimate with Vitest tests ([ea53e3d](https://github.com/MapColonies/metatile-queue-populator-ui/commit/ea53e3d010b497fede32d8f5d9633343a1970990))
* **server:** initialize BFF server skeleton from MapColonies ts-server-boilerplate with Vitest suite ([7bbe084](https://github.com/MapColonies/metatile-queue-populator-ui/commit/7bbe08494d8311d916fee6b28ad119cfd45eda51))
* **server:** TypeORM PostgreSQL persistence for presets and submission history (Tickets 15-19) ([cd00860](https://github.com/MapColonies/metatile-queue-populator-ui/commit/cd008605b3bc1c7bda4ec426398fcbceacf1b4dd))


### Bug Fixes

* **presets:** ensure clean state and reset previous map geometry when entering preset designer ([0e2955c](https://github.com/MapColonies/metatile-queue-populator-ui/commit/0e2955c25ca70a86f15b901075558da46734e6eb))
* **server:** fix TS decorators type imports for isolatedModules and reload server ([c18319d](https://github.com/MapColonies/metatile-queue-populator-ui/commit/c18319dd25fc954a323415735992dd1f81b26cd8))
* **tiles:** add 30s timeout guard and AABB spatial indexing optimization to prevent server crashes on large tile estimations ([f96a51f](https://github.com/MapColonies/metatile-queue-populator-ui/commit/f96a51f904615df97c8aaad02127b096afcf4fa3))
* **tiles:** offload tile estimation to worker_threads to keep event loop and health probes fully non-blocking ([75006a8](https://github.com/MapColonies/metatile-queue-populator-ui/commit/75006a8d0c55998dc7fb9d18e8ecfee59ed54b8c))
* **tiles:** set default metatile value to 8 across openapi schema and UI TileListForm ([1aadf81](https://github.com/MapColonies/metatile-queue-populator-ui/commit/1aadf8175097731ce53a14be59deb688315fa5a6))
