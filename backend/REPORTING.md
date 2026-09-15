# Assessment reporting

`GET /api/assessment/{year}/{area_code}` returns structured facts for Bucharest or sectors 1-6. For 2025, `POST /api/reports/explore` turns them into a short project-screening diagnosis and conditional recommendations. Earlier years are historical reference points compared with 2025. `POST /api/comparisons` interprets sector or year comparisons. The charts retain the detailed numbers; report text is generated deterministically by `project_guidance.py`.

`assessment.py` computes zonal LST and NDVI statistics from the local GeoTIFFs after CRS, nodata, and value-range checks. Results and aligned LST-NDVI relationships are persisted in `uhi_data.db`. Land Cover remains a separate annual classification summarized in `data/landcover-summary.json`; its area records are persisted in the same database.

Each persisted payload has a source-file signature. Unchanged results are read from SQLite after a backend restart. When a TIFF or the Land Cover JSON changes, the affected row is recalculated automatically. Run `backend/seed_db.py --replace` or `backend/seed-db.cmd` to precompute all 35 year-area combinations. The generated database is ignored by Git; its schema and reproducible seed script are versioned.

The seed process uses the current raster and Land Cover adapters. It does not apply sector factors, default environmental percentages, or fixed correlations.

The six-sector thermal and vegetation scores are relative ranks based only on the six sector means for the same year. They are screening categories, not standardized physical or regulatory indices. Hotspot share uses the Bucharest-wide LST 90th percentile for the same year. NDVI above 0.4 is reported as a spectral threshold, not as classified Land Cover.

Spearman and Pearson correlations use valid pixels on the same CRS and 30 m grid. Integer-cell shifts match shared grid cells and exclude unmatched raster margins. No resampling or inferred pixels are used. The relationship describes spatial association, not a causal cooling estimate.

`ndviSurfaceBreakdown` uses four mutually exclusive intervals: below 0, 0-0.2, 0.2-0.4, and at least 0.4. It must not be labelled as building, soil, water, tree, or park coverage.

Land Cover percentages count classified pixels within the stored sector polygons. Built-up includes roads, and the values describe a city or sector rather than an individual parcel. The 2015 dashboard selection uses the closest available classification, 2017, while keeping that source year in internal metadata.

Summer rasters are treated as comparable prototype inputs, but their temporal preparation has not been independently verified. Cross-year differences can also reflect weather conditions. A repeated relative signal is a planning flag rather than a numeric forecast, pollution estimate, or causal estimate of a future project.
