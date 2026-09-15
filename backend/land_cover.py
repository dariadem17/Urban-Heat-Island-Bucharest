"""Read the precomputed, source-backed annual land-cover summaries."""

import json
from functools import lru_cache
from pathlib import Path


SUMMARY_PATH = Path(__file__).resolve().parent / "data" / "landcover-summary.json"


@lru_cache(maxsize=1)
def summary():
    if not SUMMARY_PATH.is_file():
        return None
    with SUMMARY_PATH.open(encoding="utf-8") as source:
        return json.load(source)


def record(year, area):
    data = summary()
    if not data:
        return None
    return data.get("years", {}).get(str(year), {}).get("areas", {}).get(str(area))


def entries(year, area):
    data, item = summary(), record(year, area)
    if not data or not item:
        return []
    return [{**entry, "sourceYear": year, "sourceName": data["dataset"],
             "sourceUrl": data["sourceUrl"], "period": data["period"]}
            for entry in item["entries"]]
