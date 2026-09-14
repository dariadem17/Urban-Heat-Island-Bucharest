import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "UrbanHeatIslandBucharest/1.0 (local university project)"
OUTPUT_PATH = Path(__file__).resolve().parents[1] / "data" / "bucharest-sectors.geojson"


def fetch_sector(sector_id: int) -> dict:
    parameters = urlencode(
        {
            "q": f"Sector {sector_id}, Bucharest, Romania",
            "format": "geojson",
            "polygon_geojson": 1,
            "polygon_threshold": 0.00001,
            "addressdetails": 1,
            "countrycodes": "ro",
            "limit": 3,
        }
    )
    request = Request(f"{NOMINATIM_URL}?{parameters}", headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        collection = json.load(response)

    candidates = [
        feature
        for feature in collection.get("features", [])
        if feature.get("properties", {}).get("osm_type") == "relation"
        and feature.get("properties", {}).get("category") == "boundary"
        and feature.get("geometry", {}).get("type") in {"Polygon", "MultiPolygon"}
    ]
    if not candidates:
        raise RuntimeError(f"Nu am găsit limita administrativă pentru Sectorul {sector_id}.")

    source_feature = candidates[0]
    return {
        "type": "Feature",
        "properties": {
            "sectorId": str(sector_id),
            "name": f"Sector {sector_id}",
            "source": "OpenStreetMap/Nominatim",
            "osmType": source_feature["properties"]["osm_type"],
            "osmId": source_feature["properties"]["osm_id"],
        },
        "geometry": source_feature["geometry"],
    }


def main() -> None:
    features = []
    for sector_id in range(1, 7):
        features.append(fetch_sector(sector_id))
        if sector_id < 6:
            time.sleep(1.1)

    collection = {
        "type": "FeatureCollection",
        "name": "Bucharest sectors",
        "attribution": "Data © OpenStreetMap contributors, ODbL 1.0",
        "features": features,
    }
    temporary_path = OUTPUT_PATH.with_suffix(".geojson.tmp")
    temporary_path.write_text(
        json.dumps(collection, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    temporary_path.replace(OUTPUT_PATH)
    print(f"Am salvat {len(features)} sectoare în {OUTPUT_PATH}.")


if __name__ == "__main__":
    main()
