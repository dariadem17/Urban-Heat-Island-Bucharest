"""Raster-backed LST/NDVI screening with separate annual land-cover context."""

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.warp import transform_geom
from scipy.stats import spearmanr

try:
    from .land_cover import record as land_cover_record
    from .project_guidance import apply_guidance, report_for
except ImportError:
    from land_cover import record as land_cover_record
    from project_guidance import apply_guidance, report_for


DATA_DIR = Path(__file__).resolve().parent / "data"
METHOD = "raster-screening-v2"


@lru_cache(maxsize=1)
def boundaries():
    with (DATA_DIR / "bucharest-sectors.geojson").open(encoding="utf-8") as source:
        return json.load(source)["features"]


def area_name(area):
    return "Bucuresti" if area == "all" else f"Sectorul {area}"


@lru_cache(maxsize=7)
def timeline(area):
    """Small annual series for historical context and relative-city persistence."""
    rows = []
    for year in (2015, 2018, 2020, 2023, 2025):
        lst, ndvi = statistics("lst", year, area), statistics("ndvi", year, area)
        city_lst, city_ndvi = statistics("lst", year, "all"), statistics("ndvi", year, "all")
        cover = land_cover_record(year, area)
        entries = cover["entries"] if cover else []
        rows.append({
            "year": year,
            "lst": lst["mean"] if lst else None,
            "ndvi": ndvi["mean"] if ndvi else None,
            "lstVsCity": round(lst["mean"] - city_lst["mean"], 2) if lst and city_lst and area != "all" else None,
            "ndviVsCity": round(ndvi["mean"] - city_ndvi["mean"], 3) if ndvi and city_ndvi and area != "all" else None,
            "builtPct": next((item["percentage"] for item in entries if item["categoryId"] == "built-up"), None),
            "treesPct": next((item["percentage"] for item in entries if item["categoryId"] == "trees"), None),
        })
    return rows


def _geometries(area):
    if area == "all":
        return [feature["geometry"] for feature in boundaries()]
    if area not in {"1", "2", "3", "4", "5", "6"}:
        raise ValueError("Unknown area")
    matching = [feature["geometry"] for feature in boundaries()
                if str(feature["properties"].get("sectorId", feature["properties"].get("name", "").split()[-1])) == area]
    if not matching:
        raise ValueError("Limita sectorului nu este disponibila")
    return matching


@lru_cache(maxsize=4)
def pixels(metric, year, area):
    path = DATA_DIR / f"{metric}_{year}.tif"
    if not path.is_file():
        return None
    with rasterio.open(path) as source:
        if source.crs is None or source.count != 1:
            return None
        geometry = [transform_geom("EPSG:4326", source.crs, item) for item in _geometries(area)]
        try:
            clipped, transform = mask(source, geometry, crop=True, filled=False, indexes=1)
        except ValueError:  # The scene does not intersect this area.
            return None
        values = clipped.astype("float64").filled(np.nan)
        valid = np.isfinite(values)
        if not valid.any():
            return None
        if metric == "lst" and float(np.median(values[valid])) > 200:
            values[valid] = values[valid] * 0.00341802 + 149.0 - 273.15
        if metric == "ndvi":
            valid &= (values >= -1) & (values <= 1)
        else:
            valid &= (values > -80) & (values < 100)
        if not valid.any():
            return None
        values[~valid] = np.nan
        return values, transform, str(source.crs), path.name


@lru_cache(maxsize=84)
def statistics(metric, year, area):
    result = pixels(metric, year, area)
    if result is None:
        return None
    data = result[0]
    valid = data[np.isfinite(data)]
    facts = {
        "min": round(float(np.min(valid)), 2),
        "max": round(float(np.max(valid)), 2),
        "mean": round(float(np.mean(valid)), 2 if metric == "lst" else 3),
        "validPixels": int(valid.size),
        "source": result[3],
    }
    if metric == "lst":
        threshold = hotspot_threshold(year)
        facts["hotspotPct"] = round(float(np.mean(valid > threshold) * 100), 1)
        facts["hotspotThresholdC"] = threshold
        edges, labels = [-np.inf, 25, 30, 35, 40, np.inf], ["<25 °C", "25–30 °C", "30–35 °C", "35–40 °C", ">40 °C"]
    else:
        facts["vegetatedPct"] = round(float(np.mean(valid > 0.4) * 100), 1)
        edges, labels = [-np.inf, .2, .4, .6, np.inf], ["<0.2", "0.2–0.4", "0.4–0.6", ">0.6"]
    counts, _ = np.histogram(valid, bins=edges)
    facts["distribution"] = [{"label": label, "value": round(float(count / valid.size * 100), 1)}
                             for label, count in zip(labels, counts)]
    if metric == "ndvi":
        spectral_edges = [-np.inf, 0, .2, .4, np.inf]
        spectral_labels = ["NDVI < 0", "NDVI 0–0.2", "NDVI 0.2–0.4", "NDVI ≥ 0.4"]
        spectral_colors = ["#38bdf8", "#94a3b8", "#a3e635", "#22c55e"]
        spectral_counts, _ = np.histogram(valid, bins=spectral_edges)
        facts["surfaceBreakdown"] = [
            {"label": label, "percentage": round(float(count / valid.size * 100), 1), "color": color}
            for label, count, color in zip(spectral_labels, spectral_counts, spectral_colors)
        ]
    return facts


@lru_cache(maxsize=8)
def hotspot_threshold(year):
    city_pixels = pixels("lst", year, "all")
    if city_pixels is None:
        return None
    return round(float(np.nanpercentile(city_pixels[0], 90)), 2)


def _level(value):
    if value <= 20:
        return "very low"
    if value <= 40:
        return "low"
    if value <= 60:
        return "moderate"
    if value <= 80:
        return "high"
    return "very high"


def _sector_percentile(value, values, reverse=False):
    """Documented, six-sector comparative rank; not a continuous physical index."""
    ordered = sorted(values, reverse=reverse)
    return round(100 * ordered.index(value) / (len(ordered) - 1)) if len(ordered) > 1 else None


@lru_cache(maxsize=48)
def relationship(year, area):
    lst = pixels("lst", year, area)
    ndvi = pixels("ndvi", year, area)
    if lst is None or ndvi is None:
        return {"available": False, "reason": "Nu exista o pereche de rastere LST si NDVI pentru aceasta selectie."}
    lst_grid, ndvi_grid = lst[1], ndvi[1]
    if lst[2] != ndvi[2] or not np.allclose(
        [lst_grid.a, lst_grid.b, lst_grid.d, lst_grid.e],
        [ndvi_grid.a, ndvi_grid.b, ndvi_grid.d, ndvi_grid.e], atol=1e-9,
    ) or lst_grid.b != 0 or lst_grid.d != 0:
        return {"available": False, "reason": "Rasterele LST si NDVI au sisteme de coordonate sau grile incompatibile."}
    column_offset = (ndvi_grid.c - lst_grid.c) / lst_grid.a
    row_offset = (ndvi_grid.f - lst_grid.f) / lst_grid.e
    if abs(column_offset - round(column_offset)) > 1e-6 or abs(row_offset - round(row_offset)) > 1e-6:
        return {"available": False, "reason": "Pixelii LST si NDVI nu se suprapun exact; nu s-a aplicat interpolare."}
    column_offset, row_offset = round(column_offset), round(row_offset)
    lst_col, ndvi_col = max(0, column_offset), max(0, -column_offset)
    lst_row, ndvi_row = max(0, row_offset), max(0, -row_offset)
    rows = min(lst[0].shape[0] - lst_row, ndvi[0].shape[0] - ndvi_row)
    columns = min(lst[0].shape[1] - lst_col, ndvi[0].shape[1] - ndvi_col)
    if rows <= 0 or columns <= 0:
        return {"available": False, "reason": "Rasterele LST si NDVI nu au pixeli comuni in aceasta zona."}
    lst_values = lst[0][lst_row:lst_row + rows, lst_col:lst_col + columns]
    ndvi_values = ndvi[0][ndvi_row:ndvi_row + rows, ndvi_col:ndvi_col + columns]
    valid = np.isfinite(lst_values) & np.isfinite(ndvi_values)
    x, y = ndvi_values[valid], lst_values[valid]
    if x.size < 30 or np.std(x) == 0 or np.std(y) == 0:
        return {"available": False, "reason": "Exista prea putini pixeli valizi pentru estimarea relatiei."}
    pearson = round(float(np.corrcoef(x, y)[0, 1]), 3)
    spearman = round(float(spearmanr(x, y).statistic), 3)
    strength = ("very weak" if abs(spearman) < .2 else "weak" if abs(spearman) < .4
                else "moderate" if abs(spearman) < .6 else "strong" if abs(spearman) < .8 else "very strong")
    low = y[x < .2]
    high = y[x >= .4]
    contrast = ({"lowNdviMeanLstC": round(float(np.mean(low)), 2),
                 "highNdviMeanLstC": round(float(np.mean(high)), 2),
                 "highMinusLowC": round(float(np.mean(high) - np.mean(low)), 2),
                 "lowCount": int(low.size), "highCount": int(high.size)}
                if low.size >= 30 and high.size >= 30 else None)
    sample_indices = np.random.default_rng(0).choice(x.size, size=min(x.size, 250), replace=False)
    sample_points = [{"ndvi": round(float(x[i]), 3), "lst": round(float(y[i]), 2)} for i in sample_indices]
    summary = ("In aceasta zona, valorile NDVI mai mari tind sa coincida cu temperaturi mai mici ale suprafetei."
               if spearman <= -.2 else
               "In aceasta zona, valorile NDVI mai mari tind sa coincida cu temperaturi mai mari ale suprafetei."
               if spearman >= .2 else
               "Pixelii comparati nu arata un tipar clar intre NDVI si temperatura suprafetei.")
    return {"available": True, "pearsonR": pearson, "spearmanRho": spearman,
            "sampleCount": int(x.size), "direction": "negative" if spearman < 0 else "positive" if spearman > 0 else "neutral",
            "strength": strength, "summary": summary, "contrast": contrast, "samplePoints": sample_points,
            "method": "Corelatii Spearman si Pearson pe pixeli valizi de 30 m, aliniati exact in acelasi sistem de coordonate; marginile nealiniate au fost excluse, fara reesantionare"}


@lru_cache(maxsize=48)
def assessment(year, area):
    _geometries(area)
    lst, ndvi = statistics("lst", year, area), statistics("ndvi", year, area)
    city_lst, city_ndvi = statistics("lst", year, "all"), statistics("ndvi", year, "all")
    sector_lst = [statistics("lst", year, str(i)) for i in range(1, 7)]
    sector_ndvi = [statistics("ndvi", year, str(i)) for i in range(1, 7)]
    city_candidates = []
    if city_lst and city_ndvi:
        for index, (sector_heat, sector_green) in enumerate(zip(sector_lst, sector_ndvi), start=1):
            if sector_heat and sector_green:
                heat_delta = round(sector_heat["mean"] - city_lst["mean"], 2)
                green_delta = round(sector_green["mean"] - city_ndvi["mean"], 3)
                if heat_delta > 0 and green_delta < 0:
                    city_candidates.append({"sector": index, "lstDeltaC": heat_delta, "ndviDelta": green_delta})
        city_candidates.sort(key=lambda item: item["lstDeltaC"], reverse=True)
    thermal_score = (_sector_percentile(lst["mean"], [item["mean"] for item in sector_lst])
                     if area != "all" and lst and all(sector_lst) else None)
    deficit_score = (_sector_percentile(ndvi["mean"], [item["mean"] for item in sector_ndvi], reverse=True)
                     if area != "all" and ndvi and all(sector_ndvi) else None)
    thermal = {"available": bool(lst), "avgLstC": lst["mean"] if lst else None,
               "cityAvgLstC": city_lst["mean"] if city_lst else None,
               "deltaVsCityC": round(lst["mean"] - city_lst["mean"], 2) if lst and city_lst else None,
               "hotspotAreaPct": lst["hotspotPct"] if lst else None,
               "cityHotspotAreaPct": city_lst["hotspotPct"] if city_lst else None,
               "hotspotThresholdC": lst["hotspotThresholdC"] if lst else None,
               "score": thermal_score, "level": _level(thermal_score) if thermal_score is not None else None,
               "reason": None if lst else "Rasterul LST local nu este disponibil sau nu este valid."}
    vegetation = {"available": bool(ndvi), "avgNdvi": ndvi["mean"] if ndvi else None,
                  "cityAvgNdvi": city_ndvi["mean"] if city_ndvi else None,
                  "deltaVsCity": round(ndvi["mean"] - city_ndvi["mean"], 3) if ndvi and city_ndvi else None,
                  "vegetatedAreaPct": ndvi["vegetatedPct"] if ndvi else None,
                  "surfaceBreakdown": ndvi["surfaceBreakdown"] if ndvi else [],
                  "vegetatedDefinition": "Procentul pixelilor NDVI valizi peste 0.4; nu este o clasificare a terenului." if ndvi else None,
                  "deficitScore": deficit_score, "level": _level(deficit_score) if deficit_score is not None else None,
                  "reason": None if ndvi else "Rasterul NDVI local nu este disponibil sau nu este valid."}
    cooling = {key: value for key, value in relationship(year, area).items() if key != "samplePoints"}
    cover = land_cover_record(year, area)
    city_cover = land_cover_record(year, "all")
    built_pct = next((entry["percentage"] for entry in cover["entries"] if entry["categoryId"] == "built-up"), 0) if cover else None
    city_built_pct = next((entry["percentage"] for entry in city_cover["entries"] if entry["categoryId"] == "built-up"), 0) if city_cover else None
    facts = {
        "area": {"code": "bucharest" if area == "all" else f"sector_{area}", "name": area_name(area)},
        "year": year, "season": "summer", "thermal": thermal, "vegetation": vegetation,
        "cooling": cooling,
        "landCover": {"available": bool(cover), "sourceYear": year if cover else None,
                      "period": "anual" if cover else None, "entries": cover["entries"] if cover else [],
                      "validPixels": cover["validPixels"] if cover else None},
        "builtPressure": {"available": bool(cover), "builtPct": built_pct, "cityBuiltPct": city_built_pct,
                          "reason": None if cover else "Nu exista land cover pentru acest an."},
        "resilience": {"available": False, "reason": "Nu exista un scor de rezilienta validat pentru aceasta aplicatie."},
        "intervention": {"available": bool(lst and ndvi), "priority": "insufficient data",
                         "recommendations": [], "basis": ""},
        "benchmark": {"available": area != "all" and bool(all(sector_lst) and all(sector_ndvi)),
                      "prioritySectors": city_candidates[:2] if area == "all" else [],
                      "thermalScore": thermal_score, "vegetationDeficitScore": deficit_score,
                      "totalComparableAreas": 6 if all(sector_lst) and all(sector_ndvi) else None,
                      "method": "Rang intre sase sectoare; 0 este valoarea cea mai mica, 100 cea mai mare pentru fiecare indicator."},
        "provenance": {"lst": {"status": "DERIVED" if lst else "UNAVAILABLE", "source": lst["source"] if lst else None,
                                "validPixels": lst["validPixels"] if lst else None},
                       "ndvi": {"status": "DERIVED" if ndvi else "UNAVAILABLE", "source": ndvi["source"] if ndvi else None,
                                 "validPixels": ndvi["validPixels"] if ndvi else None},
                        "landCover": {"status": "DERIVED" if cover else "UNAVAILABLE",
                                      "source": "Esri / Impact Observatory / Microsoft Sentinel-2 Land Cover" if cover else None,
                                      "sourceYear": year if cover else None}},
        "methodologyVersion": METHOD,
    }
    return apply_guidance(facts)
