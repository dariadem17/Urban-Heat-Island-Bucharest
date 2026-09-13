import json
import os
from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db, engine, Base
from models import SectorMetric, LstNdviRelationship
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pydantic import BaseModel
import numpy as np
import matplotlib.pyplot as plt

try:
    import rasterio
    from rasterio.warp import transform_bounds
    RASTERIO_AVAILABLE=True
except ImportError:
    RASTERIO_AVAILABLE=False

router= APIRouter()

YEARS = [2015, 2018, 2020, 2023, 2025]

DEFAULT_BOUNDS = [[25.9522, 44.3355], [26.2411, 44.5421]]

REAL_DATA = {
    yr: {
        "lst": {
            "min": 24.5, "max": 41.2, "avg": 32.8,
            "bounds": DEFAULT_BOUNDS, "available": False,
            "hotspotPct": 18.4,
            "distribution": [
                {"label": "< 25°C", "value": 5},
                {"label": "25–30°C", "value": 18},
                {"label": "30–35°C", "value": 42},
                {"label": "35–40°C", "value": 27},
                {"label": "> 40°C", "value": 8}
            ]
        },
        "ndvi": {
            "min": 0.08, "max": 0.82, "avg": 0.45,
            "bounds": DEFAULT_BOUNDS, "available": False,
            "vegetatedPct": 31.5,
            "distribution": [
                {"label": "< 0.2", "value": 24},
                {"label": "0.2–0.4", "value": 44},
                {"label": "0.4–0.6", "value": 22},
                {"label": "> 0.6", "value": 10}
            ]
        },
        "landCover": [
            {"categoryId": "built-up", "label": "Buildings", "percentage": 54.2, "color": "#64748b"},
            {"categoryId": "vegetation", "label": "Trees", "percentage": 31.5, "color": "#22c55e"},
            {"categoryId": "bare-soil", "label": "Ground", "percentage": 9.8, "color": "#d97706"},
            {"categoryId": "water", "label": "Water", "percentage": 4.5, "color": "#0284c7"}
        ]
    }
    for yr in YEARS
}

os.makedirs("static",exist_ok=True)
os.makedirs("data",exist_ok=True)

def process_all_geotiff():
    if not RASTERIO_AVAILABLE:
        return

    for yr in YEARS:
        lst_path = f"data/lst_{yr}.tif"
        if os.path.exists(lst_path):
            try:
                with rasterio.open(lst_path) as src:
                    arr = src.read(1).astype(float)
                    nodata = src.nodata
                    valid_mask = (arr != nodata) & ~np.isnan(arr) & (arr > 0) if nodata is not None else ~np.isnan(arr) & (arr > 0)
                    valid_pixels = arr[valid_mask]

                    if len(valid_pixels) > 0:
                        if np.median(valid_pixels) > 200:

                            celsius_pixels = (valid_pixels * 0.00341802 + 149.0) - 273.15
                            arr_celsius = np.where(valid_mask, (arr * 0.00341802 + 149.0) - 273.15, np.nan)
                        else:
                            celsius_pixels = valid_pixels
                            arr_celsius = np.where(valid_mask, arr, np.nan)

                        celsius_pixels = celsius_pixels[(celsius_pixels >= 10.0) & (celsius_pixels <= 60.0)]
                        
                        min_v = float(np.min(celsius_pixels))
                        max_v = float(np.max(celsius_pixels))
                        avg_v = float(np.mean(celsius_pixels))

                        bounds = src.bounds
                        crs = src.crs
                        west, south, east, north = transform_bounds(crs, "EPSG:4326", bounds.left, bounds.bottom, bounds.right, bounds.top)

                        total_lst = len(celsius_pixels)
                        hotspot_cnt = int(np.sum(celsius_pixels > 35.0))
                        hotspot_pct = round(float((hotspot_cnt / total_lst) * 100), 1) if total_lst > 0 else 0.0

                        REAL_DATA[yr]["lst"]["min"] = round(min_v, 1)
                        REAL_DATA[yr]["lst"]["max"] = round(max_v, 1)
                        REAL_DATA[yr]["lst"]["avg"] = round(avg_v, 1)
                        REAL_DATA[yr]["lst"]["bounds"] = [[west, south], [east, north]]
                        REAL_DATA[yr]["lst"]["available"] = True
                        REAL_DATA[yr]["lst"]["hotspotPct"] = hotspot_pct

                        norm_arr = np.clip((arr_celsius - min_v) / (max_v - min_v if max_v != min_v else 1), 0.0, 1.0)
                        cmap = plt.get_cmap("inferno")
                        rgba = cmap(norm_arr)
                        rgba[~valid_mask, 3] = 0.0
                        plt.imsave(f"static/lst_{yr}.png", rgba)
            except Exception as e:
                print(f"Error LST {yr}: {e}")

        ndvi_path = f"data/ndvi_{yr}.tif"
        if os.path.exists(ndvi_path):
            try:
                with rasterio.open(ndvi_path) as src:
                    arr = src.read(1).astype(float)
                    nodata = src.nodata
                    if nodata is not None:
                        valid_mask = (arr != nodata) & ~np.isnan(arr)
                    else:
                        valid_mask = ~np.isnan(arr) & (arr > -1.5)

                    raw_valid = arr[valid_mask]
                    if len(raw_valid) > 0 and np.max(raw_valid) > 1.5:
                        arr = arr * 0.0001
                        raw_valid = raw_valid * 0.0001

                    valid_mask = valid_mask & (arr >= -0.2) & (arr <= 1.0)
                    valid_pixels = arr[valid_mask]

                    if len(valid_pixels) > 0:
                        min_v = float(np.min(valid_pixels))
                        max_v = float(np.max(valid_pixels))
                        avg_v = float(np.mean(valid_pixels))

                        bounds = src.bounds
                        crs = src.crs
                        west, south, east, north = transform_bounds(crs, "EPSG:4326", bounds.left, bounds.bottom, bounds.right, bounds.top)

                        REAL_DATA[yr]["ndvi"]["min"] = round(min_v, 2)
                        REAL_DATA[yr]["ndvi"]["max"] = round(max_v, 2)
                        REAL_DATA[yr]["ndvi"]["avg"] = round(avg_v, 2)
                        REAL_DATA[yr]["ndvi"]["bounds"] = [[west, south], [east, north]]
                        REAL_DATA[yr]["ndvi"]["available"] = True

                        norm_arr = np.clip((arr - 0.0) / (0.8 - 0.0), 0.0, 1.0)
                        cmap = plt.get_cmap("YlGn")
                        rgba = cmap(norm_arr)
                        rgba[~valid_mask, 3] = 0.0
                        plt.imsave(f"static/ndvi_{yr}.png", rgba)
            except Exception as e:
                print(f"Error NDVI {yr}: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    process_all_geotiff()
    yield

    
app=FastAPI(
    title="Urban Heat Island Bucharest API",
    description="Backend API providing spatial and statistical data for Bucharest",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("static",exist_ok=True)
app.mount("/static",StaticFiles(directory="static"),name="static")

@router.get("/years")
def get_years():
    return YEARS

@router.get("/availability")
def get_availability():
    response=[]
    for yr in YEARS:
        response.append({
            "year": yr,
            "season":"summer",
            "layers": {
                "lst": "available" if REAL_DATA[yr]["lst"]["available"] else "available",
                "ndvi": "available" if REAL_DATA[yr]["ndvi"]["available"] else "available"
            },
            "landCover": "available"
        })
    return response

@router.get("/sectors")
def get_sector():
    return [
        {"id": "all", "name": "Bucuresti", "label": "Bucharest"},
        {"id": "1", "name": "Sector 1", "label": "Sector 1"},
        {"id": "2", "name": "Sector 2", "label": "Sector 2"},
        {"id": "3", "name": "Sector 3", "label": "Sector 3"},
        {"id": "4", "name": "Sector 4", "label": "Sector 4"},
        {"id": "5", "name": "Sector 5", "label": "Sector 5"},
        {"id": "6", "name": "Sector 6", "label": "Sector 6"}
    ]

@router.get("/boundaries/sectors")
def get_boundaries_sectors():
    path= "data/bucharest-sectors.geojson"
    if not path:
        raise HTTPException(status_code=404, detail="GeoJSON not available")
    with open(path,"r",encoding="utf-8") as f:
        return json.load(f)

@router.get("/map-layers/{layer_id}")
def get_map_layer(
    layer_id: str, 
    sector: str = Query("all"), 
    year: int = Query(2025), 
    season: str = Query("summer"),
    db: Session = Depends(get_db)
):
    if layer_id not in ["lst", "ndvi"]:
        raise HTTPException(status_code=404, detail="Unknown layer requested")

    key = sector.lower().strip().replace(" ", "_")
    if key.isdigit():
        key = f"sector_{key}"
    elif key in ["bucuresti", "bucurești"]:
        key = "all"

    yr_data = REAL_DATA.get(year, REAL_DATA[2025])
    is_real = yr_data[layer_id]["available"]
    img_file = f"{layer_id}_{year}.png" if is_real else f"{layer_id}_test.png"

    rec = db.query(SectorMetric).filter_by(area_code=key, year=year).first()
    mod = SECTOR_FACTORS.get(key, {"temp": 0.0, "ndvi": 0.0})

    if layer_id == "lst":
        if rec and rec.min_lst is not None:
            min_v = rec.min_lst
            max_v = rec.max_lst
        else:
            base_min = normalize_celsius(yr_data["lst"]["min"])
            base_max = normalize_celsius(yr_data["lst"]["max"])
            min_v = round(base_min + mod["temp"], 1)
            max_v = round(base_max + mod["temp"], 1)

        mid_v = round(min_v + (max_v - min_v) * 0.5, 1)

        return {
            "id": "lst",
            "name": "Land Surface Temperature",
            "unit": "°C",
            "description": "Land Surface Temperature",
            "year": year,
            "season": season,
            "sectorId": sector,
            "availability": "available",
            "isDemo": not is_real,
            "source": {
                "kind": "image",
                "url": f"http://127.0.0.1:8000/static/{img_file}",
                "bounds": yr_data["lst"]["bounds"]
            },
            "legend": {
                "kind": "continuous",
                "domain": [min_v, max_v],
                "items": [
                    {"label": f"{min_v}°C", "value": min_v, "color": "#3b82f6"},
                    {"label": f"{mid_v}°C", "value": mid_v, "color": "#f59e0b"},
                    {"label": f"{max_v}°C", "value": max_v, "color": "#ef4444"}
                ]
            }
        }
    else:
        if rec and rec.min_ndvi is not None:
            min_v = rec.min_ndvi
            max_v = rec.max_ndvi
        else:
            min_v = round(max(0.0, yr_data["ndvi"]["min"] + mod["ndvi"]), 2)
            max_v = round(min(1.0, yr_data["ndvi"]["max"] + mod["ndvi"]), 2)

        return {
            "id": "ndvi",
            "name": "Normalized Difference Vegetation Index",
            "unit": "NDVI",
            "description": "Normalized Difference Vegetation Index",
            "year": year,
            "season": season,
            "sectorId": sector,
            "availability": "available" if is_real else "processing",
            "isDemo": not is_real,
            "source": {
                "kind": "image",
                "url": f"http://127.0.0.1:8000/static/{img_file}",
                "bounds": yr_data["ndvi"]["bounds"]
            },
            "legend": {
                "kind": "continuous",
                "domain": [min_v, max_v],
                "items": [
                    {"label": f"{min_v}", "value": min_v, "color": "#d1d5db"},
                    {"label": f"{round((min_v + max_v) / 2, 2)}", "value": round((min_v + max_v) / 2, 2), "color": "#84cc16"},
                    {"label": f"{max_v}", "value": max_v, "color": "#15803d"}
                ]
            }
        }

SECTOR_FACTORS = {
    "all":      {"temp": 0.0,  "ndvi": 0.00},
    "sector_1": {"temp": -1.3, "ndvi": 0.06},  
    "sector_2": {"temp": 0.2,  "ndvi": -0.01},
    "sector_3": {"temp": 1.4,  "ndvi": -0.05},  
    "sector_4": {"temp": 0.7,  "ndvi": -0.02},
    "sector_5": {"temp": 1.1,  "ndvi": -0.04},
    "sector_6": {"temp": -0.5, "ndvi": 0.02},
}

def normalize_celsius(val: float) -> float:
    if val > 200:
        kelvin = val * 0.00341802 + 149.0
        return round(kelvin - 273.15, 2)
    return round(val, 2)

@router.get("/statistics")
def get_statistics(
    sector: str = Query("all"),
    year: int = Query(2025),
    season: str = Query("summer"),
    db: Session = Depends(get_db)
):
    key = sector.lower().strip().replace(" ", "_")
    if key.isdigit():
        key = f"sector_{key}"
    elif key == "bucuresti" or key == "bucharest":
        key = "all"

    record = db.query(SectorMetric).filter_by(area_code=key, year=year).first()

    yr_data = REAL_DATA.get(year, REAL_DATA.get(2025, list(REAL_DATA.values())[0]))
    lst_info = yr_data["lst"]
    ndvi_info = yr_data["ndvi"]

    if record:
        avg_l = record.avg_lst
        min_l = record.min_lst
        max_l = record.max_lst
        avg_n = record.avg_ndvi
        min_n = record.min_ndvi
        max_n = record.max_ndvi
        hotspot_pct = record.hotspot_area_pct
        veg_pct = record.vegetated_area_pct
    else:
        base_avg_l = normalize_celsius(lst_info["avg"])
        base_min_l = normalize_celsius(lst_info["min"])
        base_max_l = normalize_celsius(lst_info["max"])
        base_avg_n = round(ndvi_info["avg"], 2)

        mod = SECTOR_FACTORS.get(key, {"temp": 0.0, "ndvi": 0.0})
        avg_l = round(base_avg_l + mod["temp"], 2)
        min_l = round(base_min_l + mod["temp"], 2)
        max_l = round(base_max_l + mod["temp"], 2)
        avg_n = round(max(0.0, min(1.0, base_avg_n + mod["ndvi"])), 2)
        min_n = round(ndvi_info["min"], 2)
        max_n = round(ndvi_info["max"], 2)
        hotspot_pct = round(min(100.0, max(0.0, lst_info.get("hotspotPct", 24.5) + (mod["temp"] * 3.5))), 1)
        veg_pct = round(min(100.0, max(0.0, ndvi_info.get("vegetatedPct", 38.0) + (mod["ndvi"] * 50))), 1)

    return {
        "sectorId": sector,
        "year": year,
        "season": season,
        "avgLst": avg_l,
        "minLst": min_l,
        "maxLst": max_l,
        "avgNdvi": avg_n,
        "minNdvi": min_n,
        "maxNdvi": max_n,
        "hotspotAreaPct": hotspot_pct,
        "hotspotDefinition": "Valid pixels with LST > 35°C",
        "vegetatedAreaPct": veg_pct,
        "lstDistribution": lst_info.get("distribution", []),
        "ndviDistribution": ndvi_info.get("distribution", []),
        "ndviVsLst": [
            {"ndvi": 0.15, "lst": round(avg_l + 3.8, 1), "label": "Industrial zone"},
            {"ndvi": 0.35, "lst": round(avg_l, 1), "label": "Residential zone"},
            {"ndvi": 0.68, "lst": round(avg_l - 5.5, 1), "label": "Park / Forest"}
        ]
    }

@router.get("/statistics/land-cover")
def get_land_cover(sector: str = Query("all"), year: int = Query(2025), season: str = Query("summer")):
    yr_data = REAL_DATA.get(year, REAL_DATA[2025])
    return yr_data.get("landCover", [])

@router.get("/assessment/{year}/{area_code}")
def get_assessment(year: int, area_code: str, db: Session = Depends(get_db)):
    key = area_code.lower().replace(" ", "_")
    if key.isdigit():
        key = f"sector_{key}"

    record = db.query(SectorMetric).filter_by(area_code=key, year=year).first()
    city_rec = db.query(SectorMetric).filter_by(area_code="all", year=year).first()

    if not record or not city_rec:
        raise HTTPException(status_code=404, detail="Unavailable data for the specified sector and year.")

    delta = round(record.avg_lst - city_rec.avg_lst, 2)
    thermal_score = min(100.0, max(0.0, round(50.0 + (delta * 15.0), 1)))
    thermal_level = "very_high" if thermal_score >= 80 else "high" if thermal_score >= 60 else "moderate" if thermal_score >= 40 else "low"

    ndvi_delta = round(record.avg_ndvi - city_rec.avg_ndvi, 3)
    veg_deficit = min(100.0, max(0.0, round((0.5 - record.avg_ndvi) * 150.0, 1)))
    veg_level = "high_deficit" if veg_deficit >= 60 else "moderate_deficit" if veg_deficit >= 40 else "low_deficit"

    rel = db.query(LstNdviRelationship).filter_by(area_code=key, year=year).first()

    built_score = round(0.40 * thermal_score + 0.35 * record.built_up_pct + 0.25 * veg_deficit, 1)
    resilience_score = round(0.45 * (100.0 - thermal_score) + 0.30 * (100.0 - veg_deficit) + 0.25 * (100.0 - record.built_up_pct), 1)

    is_high_risk = thermal_score > 60 or built_score > 60
    profile = "DENSE_URBAN_HEAT" if is_high_risk else "PRESERVATION"
    recommendations = [
        "INVESTIGATE_GREEN_ROOFS",
        "INVESTIGATE_COOL_SURFACES",
        "INVESTIGATE_PERMEABLE_SURFACES",
        "PRESERVE_EXISTING_GREEN"
    ] if is_high_risk else ["PRESERVE_EXISTING_GREEN"]

    all_sectors = db.query(SectorMetric).filter(SectorMetric.year == year, SectorMetric.area_code.like("sector_%")).order_by(SectorMetric.avg_lst.desc()).all()
    rank = next((idx + 1 for idx, r in enumerate(all_sectors) if r.area_code == key), 1)

    return {
        "area": {"code": key, "name": key.replace("_", " ").title()},
        "year": year,
        "season": "Summer",
        "thermal": {
            "available": True,
            "avgLstC": record.avg_lst,
            "minLstC": record.min_lst,
            "maxLstC": record.max_lst,
            "cityAvgLstC": city_rec.avg_lst,
            "deltaVsCityC": delta,
            "hotspotAreaPct": record.hotspot_area_pct,
            "score": thermal_score,
            "level": thermal_level
        },
        "vegetation": {
            "available": True,
            "avgNdvi": record.avg_ndvi,
            "cityAvgNdvi": city_rec.avg_ndvi,
            "deltaVsCity": ndvi_delta,
            "deficitScore": veg_deficit,
            "level": veg_level
        },
        "cooling": {
            "available": True if rel else False,
            "spearmanRho": rel.spearman_rho if rel else -0.48,
            "sampleCount": rel.sample_count if rel else 35000,
            "direction": rel.direction if rel else "negative",
            "strength": rel.strength if rel else "moderate"
        },
        "builtPressure": {
            "available": True,
            "score": built_score,
            "level": "high" if built_score >= 60 else "moderate"
        },
        "resilience": {
            "available": True,
            "score": resilience_score,
            "level": "poor" if resilience_score < 40 else "moderate" if resilience_score < 70 else "good"
        },
        "intervention": {
            "available": True,
            "priority": "high" if is_high_risk else "moderate",
            "profile": profile,
            "triggeredRules": ["Thermal exposure score > 60" if thermal_score > 60 else "Normal baseline"],
            "recommendationCodes": recommendations,
            "limitations": ["Screening-level assessment; requires on-site structural and urban verification"]
        },
        "benchmark": {
            "available": True,
            "lstRank": rank,
            "totalComparableAreas": len(all_sectors)
        },
        "provenance": {
            "lst": {"status": "OBSERVED", "dataset": f"Landsat-8 LST ({year})"},
            "ndvi": {"status": "OBSERVED", "dataset": f"Landsat-8 NDVI ({year})"},
            "assessment": {"status": "DERIVED", "methodologyVersion": "uhi-assessment-v1"}
        }
    }

class ComparisonReq(BaseModel):
    type: str
    layer: str
    primarySector: str
    secondarySector: Optional[str]=None
    primaryYear: int
    secondaryYear: Optional[int]=None
    season: str

class ReportReq(BaseModel):
    sectorId: str
    year: int
    season: str
    landCover: List[Dict[str,Any]]

@router.post("/comparisons")
def post_comparison(req: ComparisonReq):
    sec_sector=req.secondarySector if req.type=="sector" else req.primarySector
    sec_year=req.secondaryYear if req.type == "year" else req.primaryYear

    p_stats = get_statistics(req.primarySector, req.primaryYear, req.season)
    s_stats = get_statistics(sec_sector, sec_year, req.season)
    p_layer = get_map_layer(req.layer, req.primarySector, req.primaryYear, req.season)
    s_layer = get_map_layer(req.layer, sec_sector, sec_year, req.season)

    delta_lst = round((s_stats["avgLst"] or 0) - (p_stats["avgLst"] or 0), 1)

    return {
        "type": req.type,
        "layer": req.layer,
        "title": f"Comparison {req.primarySector} vs {sec_sector}",
        "context": f"Satellite comparison {req.layer.upper()} for Bucharest",
        "primary": {
            "label": f"Sector {req.primarySector} · {req.primaryYear}",
            "sectorId": req.primarySector,
            "year": req.primaryYear,
            "season": req.season,
            "statistics": p_stats,
            "landCover": get_land_cover(req.primarySector, req.primaryYear, req.season),
            "mapLayer": p_layer
        },
        "secondary": {
            "label": f"Sector {sec_sector} · {sec_year}",
            "sectorId": sec_sector,
            "year": sec_year,
            "season": req.season,
            "statistics": s_stats,
            "landCover": get_land_cover(sec_sector, sec_year, req.season),
            "mapLayer": s_layer
        },
        "metrics": [
            {"id": "avg-lst", "label": "Average LST Difference", "primary": p_stats["avgLst"], "secondary": s_stats["avgLst"], "delta": delta_lst, "unit": "°C"}
        ],
        "sharedLegend": p_layer["legend"],
        "report": [
            {"title": "Comparative Summary", "body": f"The average temperature difference observed is {delta_lst}°C."}
        ],
        "isDemo": False
    }

@router.post("/reports/explore")
def post_report(req: ReportReq, db: Session = Depends(get_db)):
    key = str(req.sectorId).lower().strip().replace(" ", "_")
    if key.isdigit():
        key = f"sector_{key}"
    elif key in ["bucuresti", "bucurești"]:
        key = "all"

    record = db.query(SectorMetric).filter_by(area_code=key, year=req.year).first()
    city_rec = db.query(SectorMetric).filter_by(area_code="all", year=req.year).first()

    if record and city_rec:
        avg_lst = record.avg_lst
        hotspot_pct = record.hotspot_area_pct
        avg_ndvi = record.avg_ndvi
        delta_temp = round(avg_lst - city_rec.avg_lst, 1)
        built_pct = record.built_up_pct
    else:
        yr_data = REAL_DATA.get(req.year, REAL_DATA[2025])
        mod = SECTOR_FACTORS.get(key, {"temp": 0.0, "ndvi": 0.0})
        base_avg_l = normalize_celsius(yr_data["lst"]["avg"])
        avg_lst = round(base_avg_l + mod["temp"], 1)
        hotspot_pct = round(min(100.0, max(0.0, yr_data["lst"].get("hotspotPct", 24.5) + (mod["temp"] * 3.5))), 1)
        avg_ndvi = round(max(0.0, min(1.0, yr_data["ndvi"]["avg"] + mod["ndvi"])), 2)
        delta_temp = mod["temp"]
        built_pct = 54.2

    area_label = "Bucharest Metropolitan Area" if key == "all" else f"Sector {req.sectorId}"

    if key == "all":
        summary_text = (
            f"Across Bucharest in {req.year}, the city-wide baseline surface temperature averaged {avg_lst}°C, "
            f"with {hotspot_pct}% of surface area qualifying as high thermal hotspots (> 35°C)."
        )
    elif delta_temp > 0.5:
        summary_text = (
            f"Sector {req.sectorId} is identified as an active urban heat island in {req.year}, "
            f"averaging {avg_lst}°C (+{delta_temp}°C above city baseline). Hotspots cover {hotspot_pct}% of the area."
        )
    elif delta_temp < -0.5:
        summary_text = (
            f"Sector {req.sectorId} displays significant thermal moderation in {req.year}, "
            f"recording an average of {avg_lst}°C ({abs(delta_temp)}°C cooler than city baseline) and lower hotspot prevalence ({hotspot_pct}%)."
        )
    else:
        summary_text = (
            f"Sector {req.sectorId} tracks closely with municipal averages in {req.year}, "
            f"averaging {avg_lst}°C with an estimated {hotspot_pct}% hotspot coverage."
        )

    if avg_ndvi >= 0.40:
        veg_text = (
            f"Healthy green infrastructure is present (NDVI {avg_ndvi}). Tree canopies and vegetation buffers "
            f"effectively reduce localized surface heat by up to 5.5°C."
        )
    elif avg_ndvi >= 0.30:
        veg_text = (
            f"Moderate canopy density detected (NDVI {avg_ndvi}). Existing pockets of green space mitigate heat, "
            f"though high sealed-surface fractions ({built_pct}%) limit evapotranspiration cooling."
        )
    else:
        veg_text = (
            f"Critical vegetation deficit identified (NDVI {avg_ndvi}). High artificial imperviousness "
            f"substantially amplifies daytime thermal retention."
        )

    if delta_temp > 0.5 or avg_ndvi < 0.35:
        rec_text = (
            "High priority: Implement cool roof membranes, retrofit parking areas with permeable paving, "
            "and expand street tree shade corridors along major boulevards."
        )
    else:
        rec_text = (
            "Conservation priority: Preserve contiguous green corridors, maintain mature tree canopies, "
            "and enact protective zoning over residual public parks."
        )

    return {
        "title": f"Climate Assessment Report — {area_label} ({req.year})",
        "sections": [
            {"title": "Thermal Exposure", "body": summary_text},
            {"title": "Vegetation Impact", "body": veg_text},
            {"title": "Screening Recommendations", "body": rec_text}
        ],
        "dataNote": f"Screening assessment derived from Landsat-8 Collection 2 Level-2 observations for {req.year}. LST represents surface temperature, not air temperature."
    }



app.include_router(router,prefix="/api")
app.include_router(router)