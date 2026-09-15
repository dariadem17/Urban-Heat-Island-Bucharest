# Urban Heat Island Bucharest — proposed backend contract

This is the frontend release-candidate contract for discussion with the backend and satellite-processing teams. Endpoint names and response envelopes may be adapted together; the domain fields and no-data behavior are what the UI requires.

All geographic coordinates must use WGS84 longitude/latitude unless the response explicitly declares another CRS. All responses should use JSON except raster/tile resources.

## A. Available data

### `GET /years`

Returns available years, for example `[2020, 2021, 2025]`.

### `GET /availability`

```json
[
  {
    "year": 2025,
    "season": "summer",
    "layers": { "lst": "available", "ndvi": "processing" },
    "landCover": "available"
  }
]
```

Statuses: `available`, `processing`, or `unavailable`. The primary map layers are only `lst` and `ndvi`. Land cover is supporting analytical data, not a selectable map layer.

### `GET /sectors`

Returns `all` plus sectors `1`–`6`, with stable IDs and labels. Optional centers may be supplied for fallback navigation.

### `GET /boundaries/sectors`

Returns a WGS84 GeoJSON FeatureCollection. Each Polygon/MultiPolygon feature needs `properties.sectorId` (`1`–`6`) and `properties.name`. Until this exists, the same validated file may be placed at `public/data/bucharest-sectors.geojson`.

## B. Map layer

### `GET /map-layers/{lst|ndvi}?sector={id}&year={year}&season=summer`

Required metadata:

```json
{
  "id": "lst",
  "name": "Land Surface Temperature",
  "unit": "°C",
  "description": "Satellite-derived surface temperature.",
  "year": 2025,
  "season": "summer",
  "sectorId": "all",
  "availability": "available",
  "isDemo": false,
  "source": {
    "kind": "raster-tiles",
    "tiles": ["https://.../{z}/{x}/{y}.png"],
    "tileSize": 256,
    "minZoom": 8,
    "maxZoom": 15
  },
  "legend": {
    "kind": "continuous",
    "domain": [20, 45],
    "items": [{ "label": "20°C", "value": 20, "color": "#60a5fa" }],
    "note": "Validated dataset scale"
  }
}
```

The source may alternatively be `{ "kind": "image", "url": "...", "bounds": [[west, south], [east, north]] }`. Browser-renderable raster tiles are preferred. A raw GeoTIFF needs a conversion/tiling service. URLs require browser-compatible CORS.

Legend thresholds/domain, palette, units, acquisition date, nodata value, spatial resolution, CRS, and processing method must originate from validated dataset metadata. Comparison datasets should share a domain when a visual comparison is scientifically valid.

## C–E. Statistics and analytical series

### `GET /statistics?sector={id}&year={year}&season=summer`

```json
{
  "sectorId": "3",
  "year": 2025,
  "season": "summer",
  "avgLst": 34.2,
  "minLst": 25.1,
  "maxLst": 43.7,
  "avgNdvi": 0.42,
  "minNdvi": 0.08,
  "maxNdvi": 0.79,
  "hotspotAreaPct": 18.4,
  "hotspotDefinition": "Percentage of valid pixels above the agreed threshold ...",
  "vegetatedAreaPct": 31.5,
  "lstDistribution": [{ "label": "30–35°C", "value": 28.4 }],
  "ndviDistribution": [{ "label": "0.4–0.6", "value": 34.1 }],
  "ndviVsLst": [{ "ndvi": 0.51, "lst": 31.8, "label": "Optional aggregate label" }]
}
```

Every metric may be `null` when unavailable; arrays may be empty. Distribution `value` should be documented as percent, pixel count, or area. LST means land surface temperature, never air temperature. Hotspot area must not be supplied without a threshold/method definition.

## F. Land cover

### `GET /statistics/land-cover?sector={id}&year={year}&season=summer`

```json
[
  { "categoryId": "built-up", "label": "Suprafete construite", "percentage": 79.8, "color": "#ef6b4a", "sourceYear": 2025, "period": "anual", "sourceName": "Esri / Impact Observatory / Microsoft Sentinel-2 10m Land Cover", "sourceUrl": "https://livingatlas.arcgis.com/landcover/" }
]
```

Categories are dynamic; the frontend does not assume a fixed count. Percentages should total approximately 100% after nodata handling and rounding. The current API serves annual source-backed summaries for 2018, 2020, 2023 and 2025. The 2015 selection uses the closest available classification, 2017, identified internally through `sourceYear`. The classification period differs from the summer LST/NDVI period. The built-up class includes roads and does not measure a parcel or planning eligibility.

## G. Comparison

The frontend service currently accepts a `ComparisonRequest` and can work with a proposed `POST /comparisons` response containing two normal dataset bundles, metrics, a shared legend, and deterministic report sections. The simpler recommended backend design is to expose the standard map/statistics/land-cover endpoints consistently for each selection; simple deltas can then be composed in the provider layer. A dedicated comparison endpoint is only necessary for validated server-side calculations, shared normalization, or derived metrics.

Percentage deltas must use percentage points. Missing metrics must be omitted rather than replaced with zero.

## H. Reports and errors

Explore reports are deterministic structured sections (`title`, `body`) plus a `dataNote`. They may be composed by the frontend from validated statistics; no LLM service is required.

Recommended error behavior:

- `404`: requested dataset combination does not exist.
- `422`: valid request but incompatible comparison/parameters.
- `503`: processing service or dataset store temporarily unavailable.
- Availability known in advance should be returned by `/availability`, not discovered only through errors.
- Never return fabricated zeros for missing data. Use `null`, empty arrays, or explicit `unavailable` status.
- Error bodies may include a stable code and safe user message; stack traces must not be exposed.

## Required coordination decisions

1. Final years and confirmation that current scenes are summer only.
2. Validated sector boundary file, source, license, CRS, and property names.
3. Raster delivery method, URL lifetime/auth behavior, bounds, CRS, nodata, resolution, and CORS.
4. LST units/calibration and validated legend domain.
5. NDVI processing definition and validated legend domain.
6. Statistical aggregation rules for city and sector clipping.
7. Hotspot threshold and area calculation.
8. Land-cover classifier and definitive dynamic classes.
9. Distribution bin definitions and whether values represent percent, pixels, or area.
10. API base URL, response envelope, error codes, and deployment environments.
