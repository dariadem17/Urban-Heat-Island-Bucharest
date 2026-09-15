# ASSESSMENT_DATA_CONTRACT.md

## Urban Heat Island Bucharest — deterministic assessment and reporting contract

**Purpose:** extend the existing LST / NDVI / Land Cover application into a credible decision-support prototype for real-estate development, without adding an LLM and without inventing environmental facts.

This contract complements the existing `BACKEND_CONTRACT.md`. It does **not** replace current layer, map, comparison, or history endpoints unless the team explicitly decides to do so.

---

## 1. Product direction

The current application already exposes the core scientific layers and visual analytics:

- LST as a map layer;
- NDVI as a map layer;
- year / location selection;
- sector or Bucharest-wide exploration;
- min / max / average statistics and hotspot information derived from the raster processing;
- Land Cover as analytical context;
- Explore and Compare workflows;
- charts and a deterministic report area.

The next step is **not** to add another satellite-derived variable in the final days before presentation. The next step is to transform the existing LST + NDVI + Land Cover data into a deterministic **Urban Development Assessment**.

The assessment must answer seven questions:

1. How thermally exposed is the selected area?
2. How strong is the vegetation deficit?
3. Is vegetation spatially associated with lower surface temperature?
4. How strong is the combined built-up heat pressure?
5. What type of mitigation should be investigated first?
6. What is the area's overall heat-resilience position?
7. How does the area compare with Bucharest, other sectors, and available years?

The prototype may later evolve into a broader **Urban Environmental Intelligence** product. Relative humidity, air temperature and air-quality sensors belong to that future roadmap and must not be fabricated from LST + NDVI in the current version.

---

## 2. Non-negotiable scientific rules

### 2.1 No hallucinated values

Every number shown in the UI or report must be one of:

- `OBSERVED`: read directly from a validated source dataset or source metadata;
- `DERIVED`: calculated deterministically from observed values;
- `CLASSIFIED`: a deterministic category obtained from documented thresholds;
- `UNAVAILABLE`: not supported by the available data.

No frontend component may invent a fallback environmental value.

### 2.2 Association is not causation

The report may say:

> Higher NDVI is associated with lower LST in the analysed data.

It must not say:

> Low vegetation caused the observed temperature.

unless a separate causal methodology exists, which the current project does not have.

### 2.3 LST is not air temperature

LST must always be described as **Land Surface Temperature / temperatura suprafeței terestre**.

The system must not present LST as ambient air temperature.

### 2.4 Relative humidity is not derived from LST + NDVI

The current project must not calculate or display relative humidity from LST and NDVI alone.

Relative humidity may be listed only as a future data source from meteorological datasets or ground sensors.

### 2.5 Recommendation wording must remain screening-level

Allowed wording:

- "should be investigated";
- "may be appropriate";
- "screening suggests";
- "priority for further site-level assessment".

Avoid definitive engineering claims such as:

- "trees must be planted here";
- "this intervention will reduce temperature by X °C";
- "this site is unsuitable for development".

The current system is an environmental screening / decision-support prototype, not a final engineering or planning authority.

---

## 3. What is confirmed in the supplied geospatial package

The supplied project files currently contain the following usable evidence.

### 3.1 NDVI

NDVI rasters are present for:

- 2015
- 2018
- 2020
- 2023
- 2025

Their metadata states:

- Landsat 8 Collection 2 Level-2;
- Summer single-scene acquisition;
- CRS `EPSG:32635`;
- 30 m resolution;
- same raster grid used for LST export;
- Bucharest administrative boundary clipping;
- nodata `-9999`;
- stored min / max / mean / valid-pixel count;
- NDVI calculated as `(SR_B5 - SR_B4) / (SR_B5 + SR_B4)`.

The supplied NDVI rasters use the same raster dimensions and bounds:

- 685 × 768 pixels;
- 30 m × 30 m;
- bounds: `417795, 4909365, 438345, 4932405`;
- CRS `EPSG:32635`.

This is useful because pixel-wise LST/NDVI analysis is valid only when the corresponding LST raster uses the same aligned grid.

### 3.2 LST

Actual clipped LST GeoTIFF files are present in the supplied package for:

- 2018
- 2023

Both inspected rasters are:

- CRS `EPSG:32635`;
- 685 × 768 pixels;
- 30 m resolution;
- exactly the same bounds as the NDVI rasters.

The QGIS project files also reference LST work for 2010, 2015, 2020 and 2025, but the corresponding final TIFF files are **not all included in the uploaded package**. Those years must not be treated as raster-available by the backend until the actual TIFFs are supplied or an existing trusted preprocessing output is imported.

### 3.3 Sector boundaries

The supplied GeoPackage contains six Bucharest sector polygons. The boundary layer can be used for zonal statistics by sector.

### 3.4 Land Cover

The current application contains annual Land Cover classifications and derived sector summaries for 2018, 2020, 2023 and 2025. For the 2015 dashboard selection, the closest available annual classification, 2017, is used as a reference and retained internally as `sourceYear: 2017`.

If Land Cover is unavailable for another year/area, the API must return `available: false`, not demo percentages.

---

## 4. Storage strategy

Do **not** put every raster pixel into a normal relational table just to say that the application uses a database.

Recommended split:

### File storage

Keep source / processed geospatial rasters as files:

- LST GeoTIFF;
- NDVI GeoTIFF;
- Land Cover raster/vector if applicable;
- sector boundaries.

### Relational database

Store:

- dataset metadata;
- provenance;
- area/year statistics;
- land-cover percentages;
- derived assessment metrics;
- recommendation profiles;
- processing version / formula version.

SQLite is sufficient for the prototype. PostgreSQL/PostGIS would be a future production option, not a presentation requirement.

---

## 5. Required database model

The names below are recommendations; the backend may adapt naming to its current models as long as the semantics remain identical.

### 5.1 `areas`

One row per supported geographical unit.

| field | type | required | notes |
|---|---:|---:|---|
| `id` | text/int | yes | stable primary key |
| `code` | text | yes | e.g. `bucharest`, `sector_1` |
| `name` | text | yes | human-readable name |
| `area_type` | enum | yes | `city` or `sector` |
| `geometry_source` | text | yes | source of boundary |
| `geometry_version` | text/date | recommended | important for reproducibility |

### 5.2 `datasets`

One row per scientific raster / processed source.

| field | type | required | notes |
|---|---:|---:|---|
| `id` | PK | yes | |
| `metric` | enum | yes | `lst`, `ndvi`, `land_cover` |
| `year` | int | yes | |
| `season` | text | yes | currently `Summer` |
| `acquisition_date` | date/text | recommended | actual scene date |
| `scene_id` | text | recommended | Landsat scene id where available |
| `satellite` | text | recommended | e.g. Landsat 8 |
| `source_path` | text | yes | path or object key, not necessarily public URL |
| `crs` | text | yes | e.g. `EPSG:32635` |
| `resolution_m` | real | yes | e.g. 30 |
| `nodata_value` | real | recommended | |
| `bbox_json` | JSON/text | yes | raster extent |
| `valid_pixel_count` | int | recommended | |
| `processing_method` | text | yes | enough to explain source |
| `processing_version` | text | yes | e.g. `v1` |
| `is_validated` | bool | yes | only validated data may feed report |
| `created_at` | datetime | recommended | |

### 5.3 `area_metric_stats`

One row per area + year + metric.

| field | type | required | notes |
|---|---:|---:|---|
| `id` | PK | yes | |
| `area_id` | FK | yes | |
| `dataset_id` | FK | yes | |
| `metric` | enum | yes | `lst` / `ndvi` |
| `year` | int | yes | denormalized for convenient queries |
| `min_value` | real | yes if available | TIFF/zonal stat |
| `max_value` | real | yes if available | TIFF/zonal stat |
| `mean_value` | real | yes if available | TIFF/zonal stat |
| `median_value` | real | recommended | useful but not mandatory |
| `p10` | real | recommended | |
| `p25` | real | recommended | |
| `p75` | real | recommended | |
| `p90` | real | recommended | useful for hotspot methodology |
| `valid_pixel_count` | int | recommended | |
| `source_status` | enum | yes | `OBSERVED` / `DERIVED` |
| `calculation_version` | text | yes | |

For LST rows add either columns or an auxiliary table for:

- `hotspot_threshold_c`;
- `hotspot_area_pct`;
- `hotspot_method`.

**Important:** the project already has hotspot values. Preserve the existing trusted hotspot method if one is already implemented. Store the method and threshold so the report can explain what "hotspot" means.

If the current hotspot method is undocumented, adopt one explicit method consistently, for example city-wide `P90` for the same year, and mark the methodology as project-defined.

### 5.4 `land_cover_stats`

One row per area + year.

| field | type | required | notes |
|---|---:|---:|---|
| `id` | PK | yes | |
| `area_id` | FK | yes | |
| `year` | int | yes | |
| `dataset_id` | FK | recommended | |
| `built_up_pct` | real/null | as available | |
| `vegetation_pct` | real/null | as available | |
| `parks_pct` | real/null | as available | only if it is a distinct class |
| `water_pct` | real/null | as available | |
| `bare_soil_pct` | real/null | as available | only if actual source has this class |
| `other_pct` | real/null | as available | |
| `classification_scheme` | text | yes | exact source class mapping |
| `source_status` | enum | yes | `OBSERVED` / `UNAVAILABLE` |
| `calculation_version` | text | yes | |

**Do not automatically add `vegetation_pct + parks_pct`.** This is allowed only if the Land Cover source defines them as mutually exclusive classes.

### 5.5 `lst_ndvi_relationship`

Only populate this table when aligned LST and NDVI rasters exist for the same year and area.

| field | type | required | notes |
|---|---:|---:|---|
| `area_id` | FK | yes | |
| `year` | int | yes | |
| `sample_count` | int | yes | valid paired pixels |
| `pearson_r` | real/null | optional | |
| `spearman_rho` | real/null | recommended | more robust to non-linearity |
| `slope` | real/null | optional | exploratory only |
| `relationship_direction` | enum | yes | negative / neutral / positive |
| `relationship_strength` | enum | yes | very_weak / weak / moderate / strong |
| `available` | bool | yes | |
| `unavailable_reason` | text/null | yes if unavailable | |
| `calculation_version` | text | yes | |

For the currently supplied files, 2018 and 2023 are the safest years for direct pixel-wise LST/NDVI analysis because both corresponding aligned rasters are present in the uploaded package.

### 5.6 `assessment_results`

Stores deterministic derived indicators so frontend/report output remains stable and auditable.

| field | type | required |
|---|---:|---:|
| `area_id` | FK | yes |
| `year` | int | yes |
| `thermal_exposure_score` | real/null | yes when computable |
| `thermal_exposure_level` | enum/null | yes when computable |
| `vegetation_deficit_score` | real/null | yes when computable |
| `vegetation_deficit_level` | enum/null | yes when computable |
| `cooling_potential_level` | enum/null | only if relationship is available |
| `built_heat_pressure_score` | real/null | only if Land Cover exists |
| `built_heat_pressure_level` | enum/null | |
| `heat_resilience_score` | real/null | only if required inputs exist |
| `heat_resilience_level` | enum/null | |
| `intervention_profile` | enum/null | |
| `intervention_priority` | enum/null | |
| `benchmark_rank` | int/null | |
| `benchmark_total` | int/null | |
| `methodology_version` | text | yes |
| `computed_at` | datetime | yes |

### 5.7 `assessment_recommendations`

Recommendations must be selected from a controlled catalogue, not generated freely.

Suggested fields:

- `id`;
- `code`;
- `title`;
- `description`;
- `applicable_profile`;
- `evidence_requirement`;
- `display_order`;
- `active`.

Example recommendation codes:

- `PRESERVE_EXISTING_GREEN`;
- `INVESTIGATE_TREE_SHADE`;
- `INVESTIGATE_GREEN_ROOFS`;
- `INVESTIGATE_GREEN_FACADES`;
- `INVESTIGATE_COOL_SURFACES`;
- `INVESTIGATE_PERMEABLE_SURFACES`;
- `REQUIRE_SITE_LEVEL_ASSESSMENT`.

---

## 6. The seven deterministic assessment modules

## 6.1 Thermal Exposure / Heat Hotspot Analysis

### Inputs

- area LST mean;
- city LST mean for same year;
- hotspot percentage already produced by the processing pipeline;
- optional city-wide LST percentile distribution.

### Required outputs

- `avg_lst_c`;
- `city_avg_lst_c`;
- `delta_vs_city_c`;
- `hotspot_area_pct`;
- `hotspot_threshold_c` if available;
- `thermal_exposure_score` 0–100;
- `thermal_exposure_level`.

### Recommended scoring

Prefer a percentile-based score when enough comparable spatial values exist:

`thermal_exposure_score = percentile_rank(area_mean_LST among comparison units)`

For only six sectors, the score may look artificially discrete. If pixel/zonal distributions are available, use a city-referenced percentile rather than ranking only six values.

If a stable percentile cannot be calculated, expose `delta_vs_city_c` and `hotspot_area_pct` directly and derive a category using documented project thresholds.

### Report can say

> Average LST is 2.7 °C above the Bucharest baseline and 24% of the analysed area is classified as hotspot under the current project methodology.

### Report cannot say

> The area is 2.7 °C hotter because of insufficient vegetation.

---

## 6.2 Vegetation Deficit

### Inputs

- area mean NDVI;
- Bucharest mean NDVI for same year;
- NDVI percentile if available;
- green-cover percentage from Land Cover when available.

### Required outputs

- `avg_ndvi`;
- `city_avg_ndvi`;
- `ndvi_delta_vs_city`;
- `green_cover_pct` if available;
- `vegetation_deficit_score`;
- `vegetation_deficit_level`.

### Recommended scoring

If both NDVI and a mutually compatible green-cover metric exist:

`vegetation_strength = 0.6 * NDVI_percentile + 0.4 * green_cover_percentile`

`vegetation_deficit = 100 - vegetation_strength`

If Land Cover is unavailable:

`vegetation_deficit = 100 - NDVI_percentile`

The API must also expose which formula variant was used.

### Report can say

> Vegetation indicators are below the municipal reference for the selected year.

---

## 6.3 Vegetation Cooling Potential

This is the module most likely to be overstated. Keep it conservative.

### Preconditions

- LST and NDVI rasters for the same year;
- same CRS;
- same grid / resolution / extent or explicitly resampled using a documented method;
- nodata/cloud pixels excluded;
- sufficient paired valid pixels.

The supplied 2018 and 2023 LST/NDVI raster pairs are aligned on the same 30 m EPSG:32635 grid and can support this analysis.

### Backend calculation

For each area:

1. clip/mask both rasters to the area geometry;
2. keep pixels valid in both datasets;
3. calculate Spearman correlation;
4. optionally calculate Pearson correlation as a secondary statistic;
5. store sample count;
6. classify strength conservatively.

Suggested absolute correlation strength labels:

- `< 0.20`: very weak;
- `0.20–0.39`: weak;
- `0.40–0.59`: moderate;
- `0.60–0.79`: strong;
- `>= 0.80`: very strong.

The sign must be shown separately.

### Output

- `available`;
- `spearman_rho`;
- `pearson_r` optional;
- `sample_count`;
- `direction`;
- `strength`.

### Report can say

> A moderate negative association is observed between NDVI and LST in the selected area: pixels with higher NDVI tend to coincide with lower surface temperatures.

### Report must not say

> Increasing NDVI by 0.1 will reduce temperature by X °C.

unless a separately validated predictive model is built.

---

## 6.4 Built-up Heat Pressure

### Preconditions

Requires validated Land Cover for the selected area/year.

### Inputs

- thermal exposure score;
- built-up percentage or built-up percentile;
- vegetation deficit score.

### Recommended project-defined formula

Convert built-up percentage to a city-relative percentile where possible.

`built_heat_pressure = 0.40 * thermal_exposure_score + 0.35 * built_up_percentile + 0.25 * vegetation_deficit_score`

### Classification

- 0–20: very low
- >20–40: low
- >40–60: moderate
- >60–80: high
- >80–100: very high

These labels are **project-defined comparative categories**, not a standardized environmental index.

### Output

- score;
- level;
- exact input values;
- formula version.

---

## 6.5 Green Intervention Potential / Recommendation Profile

This module is a deterministic rule engine.

It must **not** infer exact buildability, parcel availability, structural feasibility, legal feasibility or planting feasibility from Land Cover alone.

### Recommended profiles

#### A. `DENSE_URBAN_HEAT`

Condition example:

- thermal exposure = high / very high;
- vegetation deficit = high / very high;
- built-up pressure = high / very high.

Candidate recommendations:

- investigate green roofs;
- investigate façade greening;
- investigate shading / tree integration where feasible;
- investigate cool/high-reflectance surfaces;
- investigate permeable surfaces where feasible;
- preserve remaining vegetation.

#### B. `GROUND_GREENING_OPPORTUNITY`

Condition example:

- thermal exposure = high / very high;
- vegetation deficit = high / very high;
- built-up share is not high.

Candidate recommendations:

- investigate ground-level greening;
- investigate tree canopy / shade corridors;
- preserve and connect green areas;
- investigate permeable landscaped surfaces.

#### C. `OTHER_HEAT_DRIVERS`

Condition example:

- thermal exposure high;
- vegetation indicators moderate/good.

Recommendation:

- investigate additional site-level heat drivers;
- do not attribute thermal conditions primarily to vegetation deficit.

#### D. `PRESERVATION`

Condition example:

- thermal exposure low/moderate;
- vegetation indicators good.

Recommendation:

- preserve existing green infrastructure;
- avoid future loss of cooling assets.

### Required output

- `profile`;
- `priority`;
- `triggered_rules[]`;
- `recommendation_codes[]`;
- `limitations[]`.

This makes every recommendation explainable.

---

## 6.6 Urban Heat Resilience Score

This is a **project-defined comparative score**, not a scientific standard.

Avoid double-counting `built_heat_pressure` because it already contains thermal and vegetation terms.

### Preferred formula

When Land Cover exists:

`resilience = 0.45 * (100 - thermal_exposure_score)`

`           + 0.30 * vegetation_strength_score`

`           + 0.25 * (100 - built_up_percentile)`

Optional water contribution should be added only if the team explicitly validates a methodology. Do not add an arbitrary bonus merely because water is present.

When Land Cover does not exist, do **not** silently compute a weaker score using a different formula unless that variant is clearly labelled. Prefer:

`available: false`

or expose a separate `partial_resilience_score` with explicit method name.

### Classification

- 0–20: very poor
- >20–40: poor
- >40–60: moderate
- >60–80: good
- >80–100: very good

### UI/report disclaimer

> Project-defined comparative screening score; not a regulatory or standardized environmental rating.

---

## 6.7 Benchmarking

### Comparison targets

For the same year and compatible methodology:

- selected sector vs Bucharest;
- selected sector vs other sectors;
- sector vs same sector in another available year.

### Required fields

For each supported metric:

- selected value;
- Bucharest baseline;
- absolute delta;
- percentage delta where mathematically meaningful;
- rank among comparable sectors;
- percentile when meaningful;
- availability status.

### Important temporal rule

A cross-year report may compare values only if:

- the metric exists for both years;
- methodology is compatible;
- units and definitions are unchanged.

If Land Cover exists only for 2025, a 2020-vs-2025 comparison must not fabricate a 2020 Land Cover delta.

---

## 7. Provenance and credibility fields

Every assessment response should expose a compact provenance block.

Example:

```json
{
  "provenance": {
    "lst": {
      "status": "OBSERVED",
      "year": 2023,
      "sourceDatasetId": "lst_2023",
      "methodVersion": "lst-processing-v1"
    },
    "ndvi": {
      "status": "OBSERVED",
      "year": 2023,
      "sceneId": "LC08_L2SP_182029_20230825_20230905_02_T1",
      "methodVersion": "ndvi-v1"
    },
    "landCover": {
      "status": "UNAVAILABLE"
    },
    "assessment": {
      "status": "DERIVED",
      "methodologyVersion": "uhi-assessment-v1"
    }
  }
}
```

The frontend does not need to display every technical field, but they must exist so results can be audited and explained during the presentation.

---

## 8. Backend API extension

Keep existing API routes for map layers/history/sector geometries.

Add one assessment endpoint rather than forcing the frontend to orchestrate many new calls.

Recommended endpoint:

`GET /api/assessment/{year}/{area_code}`

Example:

`GET /api/assessment/2023/sector_3`

Recommended response:

```json
{
  "area": {
    "code": "sector_3",
    "name": "Sector 3"
  },
  "year": 2023,
  "season": "Summer",
  "thermal": {
    "available": true,
    "avgLstC": 0,
    "minLstC": 0,
    "maxLstC": 0,
    "cityAvgLstC": 0,
    "deltaVsCityC": 0,
    "hotspotAreaPct": 0,
    "hotspotThresholdC": 0,
    "score": 0,
    "level": "moderate"
  },
  "vegetation": {
    "available": true,
    "avgNdvi": 0,
    "cityAvgNdvi": 0,
    "deltaVsCity": 0,
    "greenCoverPct": null,
    "deficitScore": 0,
    "level": "moderate"
  },
  "cooling": {
    "available": true,
    "spearmanRho": 0,
    "pearsonR": 0,
    "sampleCount": 0,
    "direction": "negative",
    "strength": "moderate"
  },
  "builtPressure": {
    "available": false,
    "score": null,
    "level": null,
    "reason": "Land Cover is unavailable for this year"
  },
  "resilience": {
    "available": false,
    "score": null,
    "level": null,
    "reason": "Land Cover is unavailable for this year"
  },
  "intervention": {
    "available": true,
    "priority": "high",
    "profile": "dense_urban_heat",
    "triggeredRules": [],
    "recommendations": [],
    "limitations": []
  },
  "benchmark": {
    "available": true,
    "lstRank": null,
    "ndviRank": null,
    "resilienceRank": null,
    "totalComparableAreas": 6
  },
  "provenance": {},
  "methodologyVersion": "uhi-assessment-v1"
}
```

**Zero values above are placeholders illustrating shape only. They must never be returned as demo environmental measurements in production mode.**

---

## 9. Frontend responsibilities

The frontend must remain a presentation and interaction layer.

### Frontend should

- request assessment data from the backend;
- show loading / error / unavailable states;
- show existing LST/NDVI map layers;
- preserve current Explore and Compare workflows;
- render assessment scores and supporting facts;
- render the existing Land Cover chart only when real values exist;
- render the LST–NDVI scatter/relationship only when backend marks it available;
- display deterministic recommendation templates selected by backend codes;
- display method/disclaimer text where necessary;
- compare only metrics available on both sides.

### Frontend must not

- calculate environmental scores independently;
- invent missing metrics;
- infer recommendation profiles from UI-only logic;
- label LST as air temperature;
- create humidity values;
- show Land Cover placeholders as real data;
- fill unavailable historical values with the nearest year;
- describe correlation as causation.

### Recommended UI extension to current Explore page

Add one compact block below the existing KPI area:

**Urban Development Assessment**

- Thermal Exposure
- Vegetation Deficit
- Vegetation–Temperature Relationship
- Built-up Heat Pressure
- Urban Heat Resilience
- Intervention Priority

Each card should show the score/category **plus the evidence beneath it**, e.g.:

> Very High  
> +2.7 °C vs Bucharest · 24% hotspot area

Do not create seven separate pages.

### Recommended Compare extension

Reuse the current Compare mode and add rows for the new assessment metrics when both sides have compatible data.

Example:

| Metric | Sector 2 | Sector 3 |
|---|---:|---:|
| Avg LST | value | value |
| Hotspot area | value | value |
| Vegetation deficit | value | value |
| Built-up heat pressure | value | value |
| Heat resilience | value | value |

Unavailable fields must show `Not available`, not `0`.

---

## 10. Deterministic report architecture — no LLM required

The project currently does not include an LLM. That is acceptable and preferable for the presentation deadline.

The report should be constructed from controlled templates and backend facts.

### Report sections

1. **Area and period**
2. **Thermal assessment**
3. **Vegetation assessment**
4. **Built environment / Land Cover**
5. **Benchmark**
6. **Development implications**
7. **Recommended investigations**
8. **Data limitations**

### Example template logic

Backend facts:

```text
thermal.level = very_high
thermal.deltaVsCityC = +2.7
thermal.hotspotAreaPct = 24
vegetation.level = high_deficit
builtPressure.level = very_high
intervention.profile = dense_urban_heat
```

Frontend report template:

> The selected area shows very high surface thermal exposure relative to the Bucharest reference. Average LST is 2.7 °C above the city baseline and 24% of the analysed area is classified as hotspot under the project methodology.
>
> Vegetation indicators show a high deficit, while the built-environment assessment indicates very high built-up heat pressure.
>
> At screening level, this combination supports prioritising further investigation of interventions suitable for dense urban environments, including shading, preservation of existing vegetation, building-integrated greening and lower heat-absorbing surface strategies where technically feasible.

No model needs to "write" this. The paragraph is assembled from validated facts and controlled text fragments.

### Mandatory limitations paragraph

Every report should include a compact disclaimer such as:

> This assessment is a screening-level interpretation of satellite-derived LST, NDVI and available Land Cover data. It does not replace site-level meteorological, engineering, urban-planning or regulatory assessment. LST represents surface temperature, not air temperature, and reported relationships are associative rather than causal.

---

## 11. Data ingestion / preprocessing responsibilities

The backend should include a repeatable ingestion command or script, for example:

`python ingest_data.py`

Responsibilities:

1. discover validated raster inputs;
2. read metadata;
3. validate CRS / extent / resolution;
4. calculate Bucharest-wide statistics;
5. calculate zonal statistics for each sector;
6. calculate hotspot values using the agreed method;
7. calculate paired LST/NDVI relationship when raster alignment permits;
8. import Land Cover percentages when the validated source becomes available;
9. calculate the seven assessment modules;
10. write all facts, provenance and methodology versions into DB.

The web request itself should **not** recalculate entire rasters on every page load.

For the demo, precompute and cache/store assessment results.

---

## 12. Validation checks before a record enters the report

A dataset is report-eligible only if:

- year is known;
- metric is known;
- source path exists;
- CRS is known;
- nodata is handled;
- min <= mean <= max for simple bounded stats where applicable;
- percent values remain in 0–100;
- Land Cover classes sum approximately to 100% only if the classification scheme is exhaustive and mutually exclusive;
- NDVI values remain physically plausible (normally within -1 to 1);
- LST/NDVI correlation is computed only on paired valid pixels;
- comparison years use compatible methodology.

Store validation failure reasons rather than silently accepting broken values.

---

## 13. Missing-data contract

Every analytical module must support:

```json
{
  "available": false,
  "reason": "Land Cover is unavailable for 2020"
}
```

The frontend must render this explicitly.

Examples:

- LST exists, NDVI exists, Land Cover missing → thermal, vegetation and cooling relationship may work; built pressure/resilience requiring Land Cover remain unavailable.
- NDVI exists but matching LST TIFF is missing → NDVI metrics work; pixel-level cooling relationship remains unavailable.
- one comparison year lacks a metric → omit that delta rather than substitute another year.

---

## 14. Priority implementation plan for the presentation

### P0 — must work

1. DB schema for datasets, area stats and provenance.
2. Import existing LST / NDVI statistics.
3. Import Land Cover percentages as soon as the validated source is supplied.
4. `GET /api/assessment/{year}/{area}`.
5. Thermal Exposure.
6. Vegetation Deficit.
7. Benchmarking.
8. deterministic report templates.
9. no fake fallback data in report mode.

### P1 — high value

10. Built-up Heat Pressure.
11. Heat Resilience Score.
12. deterministic Intervention Profile and recommendations.

### P2 — only if data/time allows

13. Pixel-level LST–NDVI correlation / Cooling Potential for aligned years.

Do not delay the stable P0/P1 demo because one historical TIFF or Land Cover source is missing.

---

## 15. Future roadmap — presentation only, not current implementation

Possible future product evolution:

### Ground / meteorological data

- air temperature;
- relative humidity;
- wind;
- precipitation / weather context.

### IoT environmental sensors

- PM2.5;
- PM10;
- NO2;
- CO2 where relevant;
- local temperature;
- humidity;
- noise.

### Site-level urban data

- building footprints;
- impervious surface;
- parcel / available open space;
- building height / morphology;
- solar exposure / shade;
- planning constraints.

### Knowledge-backed recommendations

A future RAG/LLM layer may retrieve urban-heat mitigation guidance, standards and studies, but numerical scores must remain deterministic and sourced from the analytical backend.

---

## 16. Backend definition of done

Backend is ready when:

- database is persistent and reproducible;
- no environmental values come from random generators;
- all report facts have provenance;
- current TIFF-derived min/max/avg/hotspot values can be stored by area/year;
- validated Land Cover can be imported without schema redesign;
- assessment calculations are centralized in backend;
- methodology has a version;
- missing data is explicit;
- existing map-layer API remains functional;
- assessment endpoint is documented and stable for frontend integration.

---

## 17. Frontend definition of done

Frontend is ready when:

- existing Explore and Compare behaviour remains intact;
- assessment endpoint is consumed through the existing data-service/provider abstraction;
- assessment cards show source-backed data only;
- unavailable states are visible and professional;
- report text is deterministic and consistent with backend facts;
- no score is independently reimplemented in React;
- comparison hides unsupported metrics cleanly;
- report includes the screening-level limitation statement.

---

## 18. Recommended product wording for the presentation

Academic project:

> **Urban Heat Island Mapping for Bucharest**

Product / business extension:

> **Urban Environmental Intelligence for Real-Estate Development**

Short positioning statement:

> The platform transforms satellite-derived LST, NDVI and Land Cover information into a deterministic environmental screening assessment, helping users identify thermal exposure, vegetation deficits, built-up heat pressure and potential mitigation priorities before deeper site-level analysis.

This wording is supportable by the proposed system without claiming capabilities the current data does not provide.

---

## 19. Important note about the currently supplied repository archive

The uploaded `Urban-Heat-Island-Bucharest-main.zip` contains only `.gitignore`; it does **not** contain the current frontend or backend implementation.

Therefore this contract is grounded in:

- the current application behaviour and architecture already agreed by the team;
- the supplied geospatial data package;
- the existing API/Frontend structure previously described;
- the actual raster metadata inspected from the uploaded files.

Before implementation, the backend developer should reconcile endpoint/model names with the real current branch. No existing endpoint should be broken merely to match the example names in this document.
