"""SQLite schema for persisted, source-backed analysis results.

The payload columns keep the exact dictionaries returned by the raster and
land-cover adapters. The scalar columns make the main indicators easy to query
without decoding JSON.
"""

SCHEMA = """
CREATE TABLE IF NOT EXISTS areas (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    area_type TEXT NOT NULL CHECK (area_type IN ('city', 'sector'))
);

CREATE TABLE IF NOT EXISTS sector_metrics (
    area_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    season TEXT NOT NULL DEFAULT 'summer',
    avg_lst REAL,
    min_lst REAL,
    max_lst REAL,
    hotspot_area_pct REAL,
    avg_ndvi REAL,
    min_ndvi REAL,
    max_ndvi REAL,
    vegetated_area_pct REAL,
    lst_payload TEXT,
    ndvi_payload TEXT,
    lst_signature TEXT,
    ndvi_signature TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (area_code, year, season),
    FOREIGN KEY (area_code) REFERENCES areas(code)
);

CREATE TABLE IF NOT EXISTS lst_ndvi_relationship (
    area_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    season TEXT NOT NULL DEFAULT 'summer',
    spearman_rho REAL,
    pearson_r REAL,
    sample_count INTEGER,
    direction TEXT,
    strength TEXT,
    payload TEXT NOT NULL,
    source_signature TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (area_code, year, season),
    FOREIGN KEY (area_code) REFERENCES areas(code)
);

CREATE TABLE IF NOT EXISTS land_cover_metrics (
    area_code TEXT NOT NULL,
    year INTEGER NOT NULL,
    source_year INTEGER,
    valid_pixels INTEGER,
    payload TEXT NOT NULL,
    source_signature TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (area_code, year),
    FOREIGN KEY (area_code) REFERENCES areas(code)
);
"""


AREAS = [
    ("all", "Bucuresti", "city"),
    *[(str(index), f"Sectorul {index}", "sector") for index in range(1, 7)],
]
