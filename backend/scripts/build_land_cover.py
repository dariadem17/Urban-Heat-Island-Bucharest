"""Build reproducible Bucharest land-cover percentages from annual Esri GeoTIFFs.

Run from the repository root with backend/.venv/Scripts/python.exe
backend/scripts/build_land_cover.py. Add --download to fetch the public source rasters.
The large rasters remain local; the small derived JSON is checked into the project.
"""

import argparse
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.warp import transform_bounds, transform_geom


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SERVICE = "https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer"
SOURCE_PAGE = "https://livingatlas.arcgis.com/landcover/"
YEARS = (2018, 2020, 2023, 2025)
# Codes in the published nine-class Esri / Impact Observatory legend.
CLASSES = (
    ("built-up", "Suprafete construite", "#ef6b4a", (7,)),
    ("trees", "Arbori", "#16a34a", (2,)),
    ("low-vegetation", "Vegetatie joasa", "#84cc16", (11,)),
    ("crops", "Culturi", "#eab308", (5,)),
    ("water", "Apa", "#38bdf8", (1,)),
    ("bare-soil", "Sol gol", "#a78bfa", (8,)),
    ("other", "Alta acoperire", "#94a3b8", (4, 9)),
)
VALID_CODES = {code for _, _, _, codes in CLASSES for code in codes}


def load_boundaries():
    with (DATA_DIR / "bucharest-sectors.geojson").open(encoding="utf-8") as source:
        features = json.load(source)["features"]
    if {str(feature["properties"]["sectorId"]) for feature in features} != set("123456"):
        raise ValueError("Limitele trebuie sa contina sectoarele 1-6 exact o data")
    return features


def download(year, features, target):
    if target.is_file():
        return
    geometries = [feature["geometry"] for feature in features]
    coordinates = [point for geometry in geometries for polygon in
                   (geometry["coordinates"] if geometry["type"] == "MultiPolygon" else [geometry["coordinates"]])
                   for ring in polygon for point in ring]
    west, south = min(point[0] for point in coordinates), min(point[1] for point in coordinates)
    east, north = max(point[0] for point in coordinates), max(point[1] for point in coordinates)
    xmin, ymin, xmax, ymax = transform_bounds("EPSG:4326", "EPSG:3857", west, south, east, north)
    xmin, ymin, xmax, ymax = (round(xmin // 10 * 10), round(ymin // 10 * 10),
                             round((xmax // 10 + 1) * 10), round((ymax // 10 + 1) * 10))
    # Resolve the catalogue ID instead of assuming that its order will never change.
    catalogue_url = SERVICE + "/query?" + urlencode({
        "where": f"Year = {year}", "outFields": "OBJECTID,Year", "returnGeometry": "false", "f": "json"
    })
    with urlopen(catalogue_url, timeout=45) as response:
        features_for_year = json.load(response)["features"]
    if len(features_for_year) != 1 or features_for_year[0]["attributes"]["Year"] != year:
        raise ValueError(f"Nu exista o imagine unica pentru {year}")
    image_id = features_for_year[0]["attributes"]["OBJECTID"]
    params = {
        "bbox": f"{xmin},{ymin},{xmax},{ymax}", "bboxSR": 3857, "imageSR": 3857,
        "size": f"{round((xmax - xmin) / 10)},{round((ymax - ymin) / 10)}",
        "format": "tiff", "pixelType": "U8", "interpolation": "RSP_NearestNeighbor",
        "mosaicRule": json.dumps({"mosaicMethod": "esriMosaicLockRaster", "lockRasterIds": [image_id]}),
        "f": "image",
    }
    with urlopen(SERVICE + "/exportImage?" + urlencode(params), timeout=120) as response:
        target.write_bytes(response.read())
    with rasterio.open(target) as raster:
        if raster.count != 1 or raster.crs is None:
            target.unlink()
            raise ValueError(f"Export GeoTIFF invalid pentru {year}")


def summarize_area(data, transform, crs, geometries):
    projected = [transform_geom("EPSG:4326", crs, geometry) for geometry in geometries]
    inside = geometry_mask(projected, out_shape=data.shape, transform=transform, invert=True)
    pixels = data[inside]
    valid = np.isin(pixels, list(VALID_CODES))
    values = pixels[valid]
    if values.size == 0:
        raise ValueError("Nu exista pixeli clasificati in zona")
    entries = []
    for category_id, label, color, codes in CLASSES:
        count = int(np.isin(values, codes).sum())
        if count:
            entries.append({"categoryId": category_id, "label": label,
                            "percentage": round(count / values.size * 100, 1),
                            "color": color, "pixels": count})
    return {"entries": entries, "validPixels": int(values.size),
            "excludedPixels": int(pixels.size - values.size),
            "coveragePct": round(values.size / pixels.size * 100, 1)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Download missing annual GeoTIFFs from Esri")
    args = parser.parse_args()
    features = load_boundaries()
    output = {
        "dataset": "Esri / Impact Observatory / Microsoft Sentinel-2 10m Land Cover",
        "sourceUrl": SOURCE_PAGE, "serviceUrl": SERVICE,
        "license": "CC BY 4.0", "period": "anual",
        "method": "Exportul rasterului anual la 10 m cu ID-ul anului blocat in serviciul Esri; numararea pixelilor clasificati in limitele GeoJSON ale sectoarelor. Norii si codurile necunoscute sunt exclusi din procente.",
        "limitations": "Suprafetele construite includ si drumuri. Datele sunt anuale, nu medii ale verii; nu indica situatia unei parcele sau drepturile de construire.",
        "boundarySource": "OpenStreetMap/Nominatim; backend/data/bucharest-sectors.geojson",
        "years": {},
    }
    checksums = set()
    for year in YEARS:
        path = DATA_DIR / f"landcover_{year}.tif"
        if args.download:
            download(year, features, path)
        if not path.is_file():
            raise FileNotFoundError(f"Lipseste {path}; ruleaza cu --download")
        with rasterio.open(path) as raster:
            if raster.count != 1 or raster.crs is None:
                raise ValueError(f"Raster invalid: {path}")
            data = raster.read(1)
            checksum = hashlib.sha256(data.tobytes()).hexdigest()
            if checksum in checksums:
                raise ValueError(f"Rasterul {year} este identic cu alt an; verifica selectia temporala")
            checksums.add(checksum)
            areas = {"all": summarize_area(data, raster.transform, raster.crs,
                                            [feature["geometry"] for feature in features])}
            for feature in features:
                sector_id = str(feature["properties"]["sectorId"])
                areas[sector_id] = summarize_area(data, raster.transform, raster.crs, [feature["geometry"]])
            output["years"][str(year)] = {"sha256": checksum, "areas": areas}
        print(f"{year}: {areas['all']['validPixels']} pixeli valizi in Bucuresti")
    target = DATA_DIR / "landcover-summary.json"
    target.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Salvat {target}")


if __name__ == "__main__":
    main()
