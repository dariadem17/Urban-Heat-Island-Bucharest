"""Deterministic, raster-backed screening facts for the explore report.

No land-cover classifier or assessment database is bundled with this project.
Only the local LST/NDVI rasters are treated as measurements here.
"""

import json
from functools import lru_cache
from pathlib import Path

import numpy as np
import rasterio
from rasterio.mask import mask
from rasterio.warp import transform_geom
from scipy.stats import spearmanr


DATA_DIR = Path(__file__).resolve().parent / "data"
METHOD = "raster-screening-v2"


@lru_cache(maxsize=1)
def boundaries():
    with (DATA_DIR / "bucharest-sectors.geojson").open(encoding="utf-8") as source:
        return json.load(source)["features"]


def area_name(area):
    return "Bucharest" if area == "all" else f"Sector {area}"


def _geometries(area):
    if area == "all":
        return [feature["geometry"] for feature in boundaries()]
    if area not in {"1", "2", "3", "4", "5", "6"}:
        raise ValueError("Unknown area")
    matching = [feature["geometry"] for feature in boundaries()
                if str(feature["properties"].get("sectorId", feature["properties"].get("name", "").split()[-1])) == area]
    if not matching:
        raise ValueError("Sector boundary is unavailable")
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
        return {"available": False, "reason": "A matching LST/NDVI raster pair is unavailable."}
    lst_grid, ndvi_grid = lst[1], ndvi[1]
    if lst[2] != ndvi[2] or not np.allclose(
        [lst_grid.a, lst_grid.b, lst_grid.d, lst_grid.e],
        [ndvi_grid.a, ndvi_grid.b, ndvi_grid.d, ndvi_grid.e], atol=1e-9,
    ) or lst_grid.b != 0 or lst_grid.d != 0:
        return {"available": False, "reason": "LST and NDVI grids have incompatible CRS or pixel geometry."}
    column_offset = (ndvi_grid.c - lst_grid.c) / lst_grid.a
    row_offset = (ndvi_grid.f - lst_grid.f) / lst_grid.e
    if abs(column_offset - round(column_offset)) > 1e-6 or abs(row_offset - round(row_offset)) > 1e-6:
        return {"available": False, "reason": "LST and NDVI pixels do not share exact grid cells; no interpolation was applied."}
    column_offset, row_offset = round(column_offset), round(row_offset)
    lst_col, ndvi_col = max(0, column_offset), max(0, -column_offset)
    lst_row, ndvi_row = max(0, row_offset), max(0, -row_offset)
    rows = min(lst[0].shape[0] - lst_row, ndvi[0].shape[0] - ndvi_row)
    columns = min(lst[0].shape[1] - lst_col, ndvi[0].shape[1] - ndvi_col)
    if rows <= 0 or columns <= 0:
        return {"available": False, "reason": "LST and NDVI rasters have no shared cells in this area."}
    lst_values = lst[0][lst_row:lst_row + rows, lst_col:lst_col + columns]
    ndvi_values = ndvi[0][ndvi_row:ndvi_row + rows, ndvi_col:ndvi_col + columns]
    valid = np.isfinite(lst_values) & np.isfinite(ndvi_values)
    x, y = ndvi_values[valid], lst_values[valid]
    if x.size < 30 or np.std(x) == 0 or np.std(y) == 0:
        return {"available": False, "reason": "Too few variable paired pixels for a relationship estimate."}
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
    summary = ("Pixels with higher NDVI tend to coincide with lower surface temperature here."
               if spearman <= -.2 else
               "Pixels with higher NDVI tend to coincide with higher surface temperature here."
               if spearman >= .2 else
               "There is no clear NDVI–surface-temperature pattern in the paired pixels.")
    return {"available": True, "pearsonR": pearson, "spearmanRho": spearman,
            "sampleCount": int(x.size), "direction": "negative" if spearman < 0 else "positive" if spearman > 0 else "neutral",
            "strength": strength, "summary": summary, "contrast": contrast, "samplePoints": sample_points,
            "method": "Spearman and Pearson on same-CRS, exactly aligned valid 30 m cells; integer-cell offsets matched, unmatched edges excluded, no resampling"}


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
               "hotspotThresholdC": lst["hotspotThresholdC"] if lst else None,
               "score": thermal_score, "level": _level(thermal_score) if thermal_score is not None else None,
               "reason": None if lst else "Local LST raster is unavailable or invalid."}
    vegetation = {"available": bool(ndvi), "avgNdvi": ndvi["mean"] if ndvi else None,
                  "cityAvgNdvi": city_ndvi["mean"] if city_ndvi else None,
                  "deltaVsCity": round(ndvi["mean"] - city_ndvi["mean"], 3) if ndvi and city_ndvi else None,
                  "vegetatedAreaPct": ndvi["vegetatedPct"] if ndvi else None,
                  "surfaceBreakdown": ndvi["surfaceBreakdown"] if ndvi else [],
                  "vegetatedDefinition": "Share of valid NDVI pixels > 0.4; not classified land cover." if ndvi else None,
                  "deficitScore": deficit_score, "level": _level(deficit_score) if deficit_score is not None else None,
                  "reason": None if ndvi else "Local NDVI raster is unavailable or invalid."}
    cooling = {key: value for key, value in relationship(year, area).items() if key != "samplePoints"}
    recommendations = []
    if area == "all" and city_candidates:
        recommendations = [
            f"Review Sector {item['sector']}: mean LST is {item['lstDeltaC']:+.2f} °C and mean NDVI is {item['ndviDelta']:+.3f} versus Bucharest."
            for item in city_candidates[:2]
        ]
        recommendations.append("For those sectors, check shade, exposed paving and existing vegetation at site level before selecting interventions.")
    elif lst and ndvi and city_lst and city_ndvi:
        if lst["mean"] > city_lst["mean"] and ndvi["mean"] < city_ndvi["mean"]:
            recommendations = [
                "Investigate tree shade and ground-level greening where site conditions permit.",
                "Assess reflective surfaces, permeable paving and building-integrated greening at site level.",
                "Preserve existing vegetation before selecting new interventions.",
            ]
        elif lst["mean"] > city_lst["mean"]:
            recommendations = ["Investigate other site-level heat drivers before attributing exposure to vegetation.",
                               "Assess shade and lower heat-absorbing surfaces where feasible."]
        elif ndvi["mean"] < city_ndvi["mean"]:
            recommendations = ["Investigate opportunities to preserve and connect vegetation at site level."]
        else:
            recommendations = ["Preserve existing vegetation and monitor future surface-temperature changes."]
    else:
        recommendations = ["Obtain missing raster evidence before setting an intervention priority."]
    priority = ("compare sectors" if area == "all" and city_candidates else
                "focused review" if thermal["deltaVsCityC"] is not None and thermal["deltaVsCityC"] > 0
                and vegetation["deltaVsCity"] is not None and vegetation["deltaVsCity"] < 0
                else "routine review" if lst and ndvi else "insufficient data")
    return {
        "area": {"code": "bucharest" if area == "all" else f"sector_{area}", "name": area_name(area)},
        "year": year, "season": "summer", "thermal": thermal, "vegetation": vegetation,
        "cooling": cooling,
        "builtPressure": {"available": False, "reason": "Validated Land Cover data is not present in this project."},
        "resilience": {"available": False, "reason": "A resilience score requires validated Land Cover data."},
        "intervention": {"available": bool(lst and ndvi), "priority": priority,
                         "recommendations": recommendations, "basis": "Project screening rules using same-year city references."},
        "benchmark": {"available": area != "all" and bool(all(sector_lst) and all(sector_ndvi)),
                      "prioritySectors": city_candidates[:2] if area == "all" else [],
                      "thermalScore": thermal_score, "vegetationDeficitScore": deficit_score,
                      "totalComparableAreas": 6 if all(sector_lst) and all(sector_ndvi) else None,
                      "method": "Rank among six sectors; 0 is lowest and 100 highest for each pressure indicator."},
        "provenance": {"lst": {"status": "DERIVED" if lst else "UNAVAILABLE", "source": lst["source"] if lst else None,
                                "validPixels": lst["validPixels"] if lst else None},
                       "ndvi": {"status": "DERIVED" if ndvi else "UNAVAILABLE", "source": ndvi["source"] if ndvi else None,
                                 "validPixels": ndvi["validPixels"] if ndvi else None},
                       "landCover": {"status": "UNAVAILABLE"}},
        "methodologyVersion": METHOD,
    }


def report_for(facts):
    area, year = facts["area"]["name"], facts["year"]
    thermal, vegetation, cooling = facts["thermal"], facts["vegetation"], facts["cooling"]
    if area == "Bucharest" and thermal["available"] and vegetation["available"]:
        candidates = facts["benchmark"].get("prioritySectors", [])
        focus = (" Sectors " + " and ".join(str(item["sector"]) for item in candidates) +
                 " show both higher LST and lower NDVI than the city reference and deserve a closer look."
                 if candidates else " Select a sector to see where local conditions differ.")
        summary = (f"Bucharest is the reference area for summer {year}. Mean land surface temperature is "
                   f"{thermal['avgLstC']:.2f} °C and mean NDVI is {vegetation['avgNdvi']:.3f}."
                   f"{focus}")
    elif thermal["deltaVsCityC"] is not None and vegetation["deltaVsCity"] is not None:
        heat = "above" if thermal["deltaVsCityC"] > 0 else "below" if thermal["deltaVsCityC"] < 0 else "equal to"
        green = "below" if vegetation["deltaVsCity"] < 0 else "above" if vegetation["deltaVsCity"] > 0 else "equal to"
        summary = (f"{area} has mean surface temperature {abs(thermal['deltaVsCityC']):.2f} °C {heat} "
                   f"the Bucharest reference and mean NDVI {abs(vegetation['deltaVsCity']):.3f} {green} it in summer {year}. "
                   "Use these signals to choose what to inspect on site; they do not prove a cause or predict a temperature reduction.")
    else:
        summary = f"Evidence is incomplete for {area} in summer {year}. Check the missing datasets before prioritising interventions."
    if cooling["available"]:
        summary += f" {cooling['summary'].rstrip('.')} (Spearman ρ = {cooling['spearmanRho']:+.3f})."
    sections = [{"title": "Area and period", "body": f"{area}, summer {year}. Satellite-derived surface measurements are used for screening."}]
    if thermal["available"]:
        comparison = (f" The city reference is {thermal['cityAvgLstC']:.2f} °C; the difference is {thermal['deltaVsCityC']:+.2f} °C."
                      if thermal["deltaVsCityC"] is not None else "")
        sections.append({"title": "Thermal exposure", "body":
                         f"Mean land surface temperature (LST) is {thermal['avgLstC']:.2f} °C.{comparison} "
                         f"{thermal['hotspotAreaPct']:.1f}% of valid pixels exceed the Bucharest-wide 90th-percentile threshold of {thermal['hotspotThresholdC']:.2f} °C for this year."})
    else:
        sections.append({"title": "Thermal exposure", "body": thermal["reason"]})
    if vegetation["available"]:
        comparison = (f" The city reference is {vegetation['cityAvgNdvi']:.3f}; the difference is {vegetation['deltaVsCity']:+.3f}."
                      if vegetation["deltaVsCity"] is not None else "")
        sections.append({"title": "Vegetation signal", "body":
                         f"Mean NDVI is {vegetation['avgNdvi']:.3f}.{comparison} "
                         f"{vegetation['vegetatedAreaPct']:.1f}% of valid pixels have NDVI > 0.4. This is a spectral threshold, not a Land Cover classification."})
    else:
        sections.append({"title": "Vegetation signal", "body": vegetation["reason"]})
    if vegetation["surfaceBreakdown"]:
        breakdown = "; ".join(f"{item['label']}: {item['percentage']:.1f}%" for item in vegetation["surfaceBreakdown"])
        sections.append({"title": "NDVI surface breakdown", "body":
                         f"Shares of valid pixels by spectral interval: {breakdown}. These intervals do not identify buildings, water or land-use classes."})
    sections.append({"title": "Vegetation–temperature relationship", "body":
                     (f"Paired pixels show a {cooling['strength']} {cooling['direction']} NDVI–LST association "
                      f"(Spearman ρ = {cooling['spearmanRho']:+.3f}; Pearson r = {cooling['pearsonR']:+.3f}; "
                      f"n = {cooling['sampleCount']:,}). "
                      + (f"Mean LST for pixels with NDVI ≥ 0.4 is {cooling['contrast']['highNdviMeanLstC']:.2f} °C, "
                         f"versus {cooling['contrast']['lowNdviMeanLstC']:.2f} °C for NDVI < 0.2. "
                         if cooling['contrast'] else "")
                      + "This spatial association is not a predicted cooling effect or proof of causation."
                      if cooling["available"] else cooling["reason"])})
    sections.append({"title": "Built environment and resilience", "body":
                     "Validated Land Cover data is unavailable. Built-up heat pressure and a heat-resilience score cannot be calculated."})
    benchmark = facts["benchmark"]
    sections.append({"title": "Benchmark", "body":
                     (f"Project-defined six-sector pressure ranks: thermal {benchmark['thermalScore']}/100; "
                      f"vegetation deficit {benchmark['vegetationDeficitScore']}/100. These are relative screening ranks, not standardized ratings."
                      if benchmark["available"] else "A six-sector comparative rank is unavailable for this selection.")})
    sections.append({"title": "What to investigate", "body": " ".join(facts["intervention"]["recommendations"])})
    sections.append({"title": "Data limitations", "body":
                     "This is a screening-level interpretation of satellite LST and NDVI. LST is surface temperature, not air temperature. "
                     "Associations are not causal. Per-year scene dates and a uniform summer-selection method still need confirmation before interpreting cross-year differences. "
                     "Site-level meteorological, engineering, planning and regulatory assessment is still needed."})
    return {"title": f"Urban development assessment · {area} · {year}", "summary": summary, "sections": sections,
            "dataNote": f"Sources: LST {facts['provenance']['lst']['source'] or 'unavailable'}; "
                        f"NDVI {facts['provenance']['ndvi']['source'] or 'unavailable'}. {METHOD}. Land Cover unavailable.",
            "assessment": facts}
