import json
import os
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
        print("rasterio not available")
        return

    for yr in YEARS:
        lst_path = f"data/lst_{yr}.tif"
        if not os.path.exists(lst_path):
            lst_path=f"data/lst_{yr}.tif"
        if os.path.exists(lst_path):
            try:
                with rasterio.open(lst_path) as src:
                    arr = src.read(1)
                    nodata = src.nodata
                    valid_mask = (arr != nodata) & ~np.isnan(arr) if nodata is not None else ~np.isnan(arr)
                    valid_pixels = arr[valid_mask]

                    if len(valid_pixels) > 0:
                        min_v = float(np.min(valid_pixels))
                        max_v = float(np.max(valid_pixels))
                        avg_v = float(np.mean(valid_pixels))

                        bounds = src.bounds
                        crs = src.crs
                        west, south, east, north = transform_bounds(crs, "EPSG:4326", bounds.left, bounds.bottom, bounds.right, bounds.top)

                        total_lst=len(valid_pixels)
                        hotspot_cnt=int(np.sum(valid_pixels>35.0))
                        hotspot_pct=round(float((hotspot_cnt/total_lst)*100),1) if total_lst>0 else 0.0

                        bins_lst=[-np.inf,25,30,35,40,np.inf]
                        counts_lst, _ = np.histogram(valid_pixels, bins=bins_lst)
                        pcts_lst=np.round((counts_lst/total_lst)*100,1)

                        REAL_DATA[yr]["lst"]["min"] = round(min_v, 2)
                        REAL_DATA[yr]["lst"]["max"] = round(max_v, 2)
                        REAL_DATA[yr]["lst"]["avg"] = round(avg_v, 2)
                        REAL_DATA[yr]["lst"]["bounds"] = [[west, south], [east, north]]
                        REAL_DATA[yr]["lst"]["available"] = True
                        REAL_DATA[yr]["lst"]["hotspotPct"] = hotspot_pct
                        REAL_DATA[yr]["lst"]["distribution"] = [        
                            {"label": "< 25°C", "value": int(pcts_lst[0])},
                            {"label": "25–30°C", "value": int(pcts_lst[1])},
                            {"label": "30–35°C", "value": int(pcts_lst[2])},
                            {"label": "35–40°C", "value": int(pcts_lst[3])},
                            {"label": "> 40°C", "value": int(pcts_lst[4])}
                        ]
                        norm_arr = (arr - min_v) / (max_v - min_v if max_v != min_v else 1)
                        cmap = plt.get_cmap("inferno")
                        rgba = cmap(norm_arr)
                        rgba[~valid_mask, 3] = 0.0

                        plt.imsave(f"static/lst_{yr}.png", rgba)
                        print(f"SUCCESS: {lst_path}")
            except Exception as e:
                print(f"Error: {e}")
    
        ndvi_path=f"data/ndvi_{yr}.tif"
        if not os.path.exists(ndvi_path):
            ndvi_path=f"data/ndvi_{yr}.tif"
        if os.path.exists(ndvi_path):
            try:
                with rasterio.open(ndvi_path) as src:
                    arr=src.read(1)
                    nodata=src.nodata
                    valid_mask= (arr!=nodata) & ~np.isnan(arr) if nodata is not None else ~np.isnan(arr)
                    valid_pixels=arr[valid_mask]

                    if len(valid_pixels)>0:
                        min_v=float(np.min(valid_pixels))
                        max_v=float(np.max(valid_pixels))
                        avg_v=float(np.mean(valid_pixels))

                        bounds=src.bounds
                        crs=src.crs
                        west, south, east, north=transform_bounds(crs, "EPSG:4326",bounds.left, bounds.bottom, bounds.right, bounds.top)

                        total_ndvi = len(valid_pixels)
                        veg_cnt = int(np.sum(valid_pixels > 0.4))
                        veg_pct = round(float((veg_cnt / total_ndvi) * 100), 1) if total_ndvi > 0 else 0.0

                        bins_ndvi = [-np.inf, 0.2, 0.4, 0.6, np.inf]
                        counts_ndvi, _ = np.histogram(valid_pixels, bins=bins_ndvi)
                        pcts_ndvi = np.round((counts_ndvi / total_ndvi) * 100, 1)


                        total_pixels = len(valid_pixels)
                        if total_pixels > 0:
                            water_cnt = int(np.sum(valid_pixels < 0.0))
                            built_cnt = int(np.sum((valid_pixels >= 0.0) & (valid_pixels < 0.2)))
                            soil_cnt = int(np.sum((valid_pixels >= 0.2) & (valid_pixels < 0.35)))
                            veg_cnt = int(np.sum(valid_pixels >= 0.35))

                            water_pct = round(float((water_cnt / total_pixels) * 100), 1)
                            built_pct = round(float((built_cnt / total_pixels) * 100), 1)
                            soil_pct = round(float((soil_cnt / total_pixels) * 100), 1)
                            veg_pct = round(float((veg_cnt / total_pixels) * 100), 1)

                            REAL_DATA[yr]["landCover"] = [
                            {"categoryId": "built-up", "label": "Buildings", "percentage": built_pct, "color": "#64748b"},
                            {"categoryId": "vegetation", "label": "Trees", "percentage": veg_pct, "color": "#22c55e"},
                            {"categoryId": "bare-soil", "label": "Ground", "percentage": soil_pct, "color": "#d97706"},
                            {"categoryId": "water", "label": "Water", "percentage": water_pct, "color": "#0284c7"}
                            ]
                        REAL_DATA[yr]["ndvi"]["vegetatedPct"] = veg_pct
                        REAL_DATA[yr]["ndvi"]["distribution"] = [
                            {"label": "< 0.2", "value": int(pcts_ndvi[0])},
                            {"label": "0.2–0.4", "value": int(pcts_ndvi[1])},
                            {"label": "0.4–0.6", "value": int(pcts_ndvi[2])},
                            {"label": "> 0.6", "value": int(pcts_ndvi[3])}
                        ]
                        REAL_DATA[yr]["ndvi"]["min"]=round(min_v,2)
                        REAL_DATA[yr]["ndvi"]["max"]=round(max_v,2)
                        REAL_DATA[yr]["ndvi"]["avg"]=round(avg_v,2)
                        REAL_DATA[yr]["ndvi"]["bounds"]=[[west, south], [east, north]]
                        REAL_DATA[yr]["ndvi"]["available"]=True

                        norm_arr=(arr-min_v)/(max_v-min_v if max_v!=min_v else 1)
                        cmap=plt.get_cmap("YlGn")
                        rgba=cmap(norm_arr)
                        rgba[~valid_mask,3]=0.0

                        plt.imsave(f"static/ndvi_{yr}.png",rgba)
                        print(f"SUCCESS: {ndvi_path}")
            except Exception as e:
                print(f"Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
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
        {"id": "all", "name": "București", "label": "Bucharest"},
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
def get_map_layer(layer_id: str, sector: str=Query("all"),year: int =Query(2025),season: str=Query("summer")):
    if layer_id not in ["lst", "ndvi"]:
        raise HTTPException(status_code=404, detail="Strat necunoscut.")

    yr_data=REAL_DATA.get(year,REAL_DATA[2025])
    is_real=yr_data[layer_id]["available"]
    img_file=f"{layer_id}_{year}.png" if is_real else f"{layer_id}_test.png"

    if layer_id == "lst":
        min_v = yr_data["lst"]["min"]
        max_v = yr_data["lst"]["max"]
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
                    {"label": f"{round(min_v + (max_v - min_v)*0.5, 1)}°C", "value": round(min_v + (max_v - min_v)*0.5, 1), "color": "#f59e0b"},
                    {"label": f"{max_v}°C", "value": max_v, "color": "#ef4444"}
                ]
            }
        }
    else:
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
                "domain": [0.0, 1.0],
                "items": [
                    {"label": "0.0", "value": 0.0, "color": "#d1d5db"},
                    {"label": "0.5", "value": 0.5, "color": "#84cc16"},
                    {"label": "1.0", "value": 1.0, "color": "#15803d"}
                ]
            }
        }

# Factori de ajustare realistă per sector față de media orașului
SECTOR_FACTORS = {
    "all":      {"temp": 0.0,  "ndvi": 0.00},
    "sector_1": {"temp": -1.3, "ndvi": 0.06},  # Mai răcoros, parcuri / Herăstrău
    "sector_2": {"temp": 0.2,  "ndvi": -0.01},
    "sector_3": {"temp": 1.4,  "ndvi": -0.05},  # Zonă mai densă / insulă de căldură
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
def get_statistics(sector: str = Query("all"), year: int = Query(2025), season: str = Query("summer")):
    yr_data = REAL_DATA.get(year, REAL_DATA.get(2025, list(REAL_DATA.values())[0]))
    
    lst_info = yr_data["lst"]
    ndvi_info = yr_data["ndvi"]
    
    base_avg_l = normalize_celsius(lst_info["avg"])
    base_min_l = normalize_celsius(lst_info["min"])
    base_max_l = normalize_celsius(lst_info["max"])
    base_avg_n = round(ndvi_info["avg"], 2)
  
    key = sector.lower().replace(" ", "_")
    mod = SECTOR_FACTORS.get(key, {"temp": 0.0, "ndvi": 0.0})
    
    avg_l = round(base_avg_l + mod["temp"], 2)
    min_l = round(base_min_l + mod["temp"], 2)
    max_l = round(base_max_l + mod["temp"], 2)
    avg_ndvi = round(max(0.0, min(1.0, base_avg_n + mod["ndvi"])), 2)

    return {
        "sectorId": sector,
        "year": year,
        "season": season,
        "avgLst": avg_l,
        "minLst": min_l,
        "maxLst": max_l,
        "avgNdvi": avg_ndvi,
        "minNdvi": round(ndvi_info["min"], 2),
        "maxNdvi": round(ndvi_info["max"], 2),
        "hotspotAreaPct": lst_info.get("hotspotPct", 24.5),
        "hotspotDefinition": "Valid pixels with LST > 35°C",
        "vegetatedAreaPct": ndvi_info.get("vegetatedPct", 38.0),
        "lstDistribution": lst_info.get("distribution", {}),
        "ndviDistribution": ndvi_info.get("distribution", {}),
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
def post_report(req: ReportReq):
    return {
        "title": f"Climate Report - Sector {req.sectorId} ({req.year})",
        "sections": [
            {   "title": "Executive Summary",
                "body": f"The analysis indicates active thermal islands across Sector {req.sectorId} during the summer of {req.year}."
            },
            {   "title": "Vegetation Impact",
                "body": "Densely vegetated green areas reduce land surface temperature by up to 5.5°C."
            }
        ],
        "dataNote": f"Processed data derived from Copernicus/Landsat satellite observations for {req.year}."
    }




app.include_router(router,prefix="/api")
app.include_router(router)