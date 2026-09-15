"""Small SQLite persistence layer for calculated environmental indicators."""

import json
import sqlite3
from functools import lru_cache
from pathlib import Path

try:
    from .models import AREAS, SCHEMA
except ImportError:
    from models import AREAS, SCHEMA


DATABASE_PATH = Path(__file__).resolve().parent / "uhi_data.db"


def _connect():
    connection = sqlite3.connect(DATABASE_PATH, timeout=30)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA journal_mode = WAL")
    return connection


@lru_cache(maxsize=1)
def initialize_database():
    with _connect() as connection:
        existing_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(sector_metrics)").fetchall()
        }
        # The former demo database used the same table name but had no JSON
        # payloads or source signatures. It is safe to rebuild this derived cache.
        if existing_columns and not {"lst_payload", "ndvi_payload"}.issubset(existing_columns):
            connection.executescript(
                "DROP TABLE IF EXISTS lst_ndvi_relationship;"
                "DROP TABLE IF EXISTS land_cover_metrics;"
                "DROP TABLE IF EXISTS sector_metrics;"
                "DROP TABLE IF EXISTS areas;"
            )
        connection.executescript(SCHEMA)
        connection.executemany(
            "INSERT OR IGNORE INTO areas(code, name, area_type) VALUES (?, ?, ?)",
            AREAS,
        )


def _loads(value):
    return json.loads(value) if value else None


def get_metric(metric, year, area, signature):
    if metric not in {"lst", "ndvi"}:
        raise ValueError("Unknown metric")
    initialize_database()
    payload_column = f"{metric}_payload"
    signature_column = f"{metric}_signature"
    with _connect() as connection:
        row = connection.execute(
            f"SELECT {payload_column} AS payload, {signature_column} AS signature "
            "FROM sector_metrics WHERE area_code = ? AND year = ? AND season = 'summer'",
            (area, year),
        ).fetchone()
    return _loads(row["payload"]) if row and row["signature"] == signature else None


def save_metric(metric, year, area, signature, payload):
    if metric not in {"lst", "ndvi"}:
        raise ValueError("Unknown metric")
    initialize_database()
    if metric == "lst":
        columns = ("avg_lst", "min_lst", "max_lst", "hotspot_area_pct", "lst_payload", "lst_signature")
        values = (payload.get("mean"), payload.get("min"), payload.get("max"), payload.get("hotspotPct"),
                  json.dumps(payload, ensure_ascii=False), signature)
    else:
        columns = ("avg_ndvi", "min_ndvi", "max_ndvi", "vegetated_area_pct", "ndvi_payload", "ndvi_signature")
        values = (payload.get("mean"), payload.get("min"), payload.get("max"), payload.get("vegetatedPct"),
                  json.dumps(payload, ensure_ascii=False), signature)
    names = ", ".join(columns)
    placeholders = ", ".join("?" for _ in columns)
    updates = ", ".join(f"{column} = excluded.{column}" for column in columns)
    with _connect() as connection:
        connection.execute(
            f"INSERT INTO sector_metrics(area_code, year, season, {names}) "
            f"VALUES (?, ?, 'summer', {placeholders}) "
            f"ON CONFLICT(area_code, year, season) DO UPDATE SET {updates}, updated_at = CURRENT_TIMESTAMP",
            (area, year, *values),
        )


def get_relationship(year, area, signature):
    initialize_database()
    with _connect() as connection:
        row = connection.execute(
            "SELECT payload, source_signature FROM lst_ndvi_relationship "
            "WHERE area_code = ? AND year = ? AND season = 'summer'",
            (area, year),
        ).fetchone()
    return _loads(row["payload"]) if row and row["source_signature"] == signature else None


def save_relationship(year, area, signature, payload):
    initialize_database()
    with _connect() as connection:
        connection.execute(
            """INSERT INTO lst_ndvi_relationship(
                   area_code, year, season, spearman_rho, pearson_r, sample_count,
                   direction, strength, payload, source_signature
               ) VALUES (?, ?, 'summer', ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(area_code, year, season) DO UPDATE SET
                   spearman_rho = excluded.spearman_rho,
                   pearson_r = excluded.pearson_r,
                   sample_count = excluded.sample_count,
                   direction = excluded.direction,
                   strength = excluded.strength,
                   payload = excluded.payload,
                   source_signature = excluded.source_signature,
                   updated_at = CURRENT_TIMESTAMP""",
            (area, year, payload.get("spearmanRho"), payload.get("pearsonR"), payload.get("sampleCount"),
             payload.get("direction"), payload.get("strength"), json.dumps(payload, ensure_ascii=False), signature),
        )


def get_land_cover(year, area, signature):
    initialize_database()
    with _connect() as connection:
        row = connection.execute(
            "SELECT payload, source_signature FROM land_cover_metrics WHERE area_code = ? AND year = ?",
            (area, year),
        ).fetchone()
    return _loads(row["payload"]) if row and row["source_signature"] == signature else None


def save_land_cover(year, area, signature, payload):
    initialize_database()
    with _connect() as connection:
        connection.execute(
            """INSERT INTO land_cover_metrics(area_code, year, source_year, valid_pixels, payload, source_signature)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(area_code, year) DO UPDATE SET
                   source_year = excluded.source_year,
                   valid_pixels = excluded.valid_pixels,
                   payload = excluded.payload,
                   source_signature = excluded.source_signature,
                   updated_at = CURRENT_TIMESTAMP""",
            (area, year, payload.get("sourceYear"), payload.get("validPixels"),
             json.dumps(payload, ensure_ascii=False), signature),
        )


def clear_analysis_data():
    initialize_database()
    with _connect() as connection:
        connection.execute("DELETE FROM lst_ndvi_relationship")
        connection.execute("DELETE FROM land_cover_metrics")
        connection.execute("DELETE FROM sector_metrics")


def row_counts():
    initialize_database()
    with _connect() as connection:
        return {
            table: connection.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
            for table in ("areas", "sector_metrics", "lst_ndvi_relationship", "land_cover_metrics")
        }
