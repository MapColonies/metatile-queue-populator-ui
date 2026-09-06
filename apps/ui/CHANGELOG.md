# Changelog

## [1.1.0](https://github.com/MapColonies/metatile-queue-populator-ui/compare/ui-v1.0.0...ui-v1.1.0) (2026-09-06)


### Features

* **audit:** setup PostgreSQL database persistence for audit logs and job submission history ([eb6d97b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/eb6d97bd85bd01256a9d3640f75f488093422a40))
* **deploy:** add OpenShift Helm chart, unprivileged Nginx and server Dockerfiles, and ADR 0002 ([5dee5a3](https://github.com/MapColonies/metatile-queue-populator-ui/commit/5dee5a33283e908ed6c5ad3a164c796bc06c105c))
* **header:** implement real-time dynamic BFF health check and error indicator ([6d5f423](https://github.com/MapColonies/metatile-queue-populator-ui/commit/6d5f423e1bf9cfa334bf3faf7027bcae053225eb))
* implement area form and BFF populator proxy for /tiles/area with Vitest tests ([7b980d2](https://github.com/MapColonies/metatile-queue-populator-ui/commit/7b980d2fe4aa7d3ac7c6703d4d66c0bd74423605))
* implement Job Submission History & 1-Click Replay in UI and BFF with Vitest tests ([c45e359](https://github.com/MapColonies/metatile-queue-populator-ui/commit/c45e35970d4708638177c9b7f2c36d965bba27bb))
* implement Presets & Area Bookmarks Manager in UI and BFF with Vitest tests ([0554e2b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/0554e2bfa372343764e4bc88d0562b64ae0a45ed))
* implement Queue Metrics endpoints and Real-time Queue Dashboard view with Vitest tests ([b442a9a](https://github.com/MapColonies/metatile-queue-populator-ui/commit/b442a9a80c4d6894d11f5e504e753d44b97f3faa))
* integrate MapColonies raster catalog, WMTS serving, multi-layer manager, and on-prem default map configuration ([9bb1248](https://github.com/MapColonies/metatile-queue-populator-ui/commit/9bb1248403de9f3c15d2bdf5ec49fa3e9fe83ad7))
* **map:** add right-click context menu to copy hovered bbox or polygon in WKT, GeoJSON, or KML format ([56ce447](https://github.com/MapColonies/metatile-queue-populator-ui/commit/56ce44773d0a45fcdab1f39fa048c99fbe82ebdb))
* **presets:** generate hierarchical presets (Continent -&gt; Subregion -&gt; Country) loaded on default startup ([4a6f971](https://github.com/MapColonies/metatile-queue-populator-ui/commit/4a6f971bd25bd600fe9387537be97a648c5d6a15))
* **ui:** add interactive BBOX and Polygon drawing tools with WGS84 coordinate export ([764927b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/764927bdb722ee82138636cb89750500aa47b2b5))
* **ui:** add tiling scheme debug layer with interactive toggle ([e189cf4](https://github.com/MapColonies/metatile-queue-populator-ui/commit/e189cf4a3b49e8cdc0c37a62e74fa1c55e5e55f1))
* **ui:** display coordinates with 8 decimal places of precision ([ff7bf4e](https://github.com/MapColonies/metatile-queue-populator-ui/commit/ff7bf4ef8bd272afb51f36565cc5dd1018357a2a))
* **ui:** dynamic Preset Designer mode on map with Save Preset primary action ([3a67eb1](https://github.com/MapColonies/metatile-queue-populator-ui/commit/3a67eb1db6be77b7954847168179362c5f64112d))
* **ui:** implement interactive OpenLayers map component with navigation controls and coordinate readouts ([e90593b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/e90593b4d03cd6035c73e70d27ce3cb248822372))
* **ui:** implement live TileEstimationWidget with per-zoom breakdown and high-volume warning ([16f76d1](https://github.com/MapColonies/metatile-queue-populator-ui/commit/16f76d1299f023447ea02882639eb3d2fe679767))
* **ui:** implement PresetsView tab with 1-click loading and preset creator ([18aacd5](https://github.com/MapColonies/metatile-queue-populator-ui/commit/18aacd5d775ffef1d54f10c4ebfe135cc917aec0))
* **ui:** implement React UI shell, Material-UI theme, and tab navigation layout ([1e7e85b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/1e7e85bbfe022a3c4d956a517125e036b328eca8))
* **ui:** implement SpatialDropzone for Shapefile, KML, WKT, and GeoJSON upload with map auto-fit ([1464d89](https://github.com/MapColonies/metatile-queue-populator-ui/commit/1464d89d16f7e6e08bb275574f345d243b7f13cb))
* **ui:** implement TileListForm with coordinate grid, CSV/JSON bulk paste, and mode switcher ([869ff4f](https://github.com/MapColonies/metatile-queue-populator-ui/commit/869ff4f6fa5b0b66046dd1775ac16bfadcbc1b7d))
* **ui:** interactive preset creation with spatial file dropzone and map drawing shortcut (ADR 0001) ([32310f9](https://github.com/MapColonies/metatile-queue-populator-ui/commit/32310f99d23d5dd2c14894f44cb077931af7ce00))
* **ui:** redirect to presets tab on save and retain tile count estimator in preset editor ([be1801b](https://github.com/MapColonies/metatile-queue-populator-ui/commit/be1801b0bb19c9e0d33da2be7c8011e25cd6b913))


### Bug Fixes

* **map:** smoothly reset map view center and zoom when clearing area or navigating to clean preset designer ([4a53328](https://github.com/MapColonies/metatile-queue-populator-ui/commit/4a533283ae8f93876ad4455bb59aea6cd048176e))
* **presets:** ensure clean state and reset previous map geometry when entering preset designer ([0e2955c](https://github.com/MapColonies/metatile-queue-populator-ui/commit/0e2955c25ca70a86f15b901075558da46734e6eb))
* **tiles:** set default metatile value to 8 across openapi schema and UI TileListForm ([1aadf81](https://github.com/MapColonies/metatile-queue-populator-ui/commit/1aadf8175097731ce53a14be59deb688315fa5a6))
* **ui:** enable vertical scrolling on Presets, History, and Dashboard tab views ([60e3689](https://github.com/MapColonies/metatile-queue-populator-ui/commit/60e36895303e3b87f2dd2d9668641ab675e63f8b))
* **ui:** ensure geometry features and viewport render when loading preset on map ([4cb79c8](https://github.com/MapColonies/metatile-queue-populator-ui/commit/4cb79c8c036de40a96529c4bd17941622580618f))
* **ui:** persist MapComponent mounting across tabs to prevent OpenLayers view detachment ([e634993](https://github.com/MapColonies/metatile-queue-populator-ui/commit/e634993e1f8c16157f856b4a430e47c674a2b00a))
* **ui:** replace preset select with searchable Autocomplete featuring smooth scroll and grouping ([73d1ada](https://github.com/MapColonies/metatile-queue-populator-ui/commit/73d1adad0f6fe511a6fed3a48a8370f1e906c78b))


### Code Refactoring

* **ui:** extract appConfig with configurable defaultMetatile, zoom limits, and map center ([2be543a](https://github.com/MapColonies/metatile-queue-populator-ui/commit/2be543a9aadcb920f1d9d14354b321636d046155))
