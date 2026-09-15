"""Read the precomputed, source-backed annual land-cover summaries."""

import json
from functools import lru_cache
from pathlib import Path

try:
    from .database import get_land_cover, save_land_cover
except ImportError:
    from database import get_land_cover, save_land_cover


SUMMARY_PATH = Path(__file__).resolve().parent / "data" / "landcover-summary.json"


def _source_signature():
    if not SUMMARY_PATH.is_file():
        return "missing"
    details = SUMMARY_PATH.stat()
    return f"{details.st_size}:{details.st_mtime_ns}"


@lru_cache(maxsize=1)
def summary():
    if not SUMMARY_PATH.is_file():
        return None
    with SUMMARY_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def record(year, area):
    signature = _source_signature()
    cached = get_land_cover(year, area, signature)
    if cached is not None:
        return cached
    data = summary()
    if not data:
        return None
    year_record = data.get("years", {}).get(str(year), {})
    item = year_record.get("areas", {}).get(str(area))
    result = {**item, "sourceYear": year_record.get("sourceYear", year)} if item else None
    if result:
        save_land_cover(year, area, signature, result)
    return result


def entries(year, area):
    data, item = summary(), record(year, area)
    if not data or not item:
        return []
    return [{**entry, "sourceYear": item["sourceYear"], "sourceName": data["dataset"],
             "sourceUrl": data["sourceUrl"], "period": data["period"]}
            for entry in item["entries"]]
