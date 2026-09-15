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
    from .assessment import assessment, relationship as raster_relationship, report_for, statistics as raster_statistics, timeline
    from .land_cover import entries as land_cover_entries, record as land_cover_record
    from .project_guidance import comparison_guidance
except ImportError:
    from assessment import assessment, relationship as raster_relationship, report_for, statistics as raster_statistics, timeline
    from land_cover import entries as land_cover_entries, record as land_cover_record
    from project_guidance import comparison_guidance

try:
    import rasterio
    from rasterio.mask import mask
    from rasterio.transform import array_bounds
    from rasterio.warp import transform_bounds, transform_geom
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
    }
    for yr in YEARS
}

os.makedirs("static",exist_ok=True)
os.makedirs("data",exist_ok=True)

def read_bucharest_raster(path: str):
    """Read and crop a raster to the Bucharest administrative boundary."""
    with open("data/bucharest-sectors.geojson", "r", encoding="utf-8") as boundary_file:
        boundary_data = json.load(boundary_file)

    if boundary_data.get("type") == "FeatureCollection":
        geometries = [feature["geometry"] for feature in boundary_data.get("features", [])]
    elif boundary_data.get("type") == "Feature":
        geometries = [boundary_data["geometry"]]
    else:
        geometries = [boundary_data]

    with rasterio.open(path) as src:
        if src.crs is None:
            raise ValueError(f"Rasterul {path} nu are CRS definit.")

        projected_geometries = [
            transform_geom("EPSG:4326", src.crs, geometry)
            for geometry in geometries
        ]
        masked_array, clipped_transform = mask(
            src,
            projected_geometries,
            crop=True,
            filled=False,
            indexes=1,
        )
        arr = masked_array.astype(np.float64).filled(np.nan)
        valid_mask = np.isfinite(arr)
        projected_bounds = array_bounds(arr.shape[0], arr.shape[1], clipped_transform)
        west, south, east, north = transform_bounds(
            src.crs,
            "EPSG:4326",
            *projected_bounds,
        )

    return arr, valid_mask, (west, south, east, north)

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
                arr, valid_mask, (west, south, east, north) = read_bucharest_raster(lst_path)
                valid_pixels = arr[valid_mask]

                if len(valid_pixels) > 0:
                        # Landsat Collection 2 ST_B10 uses a scale factor and offset.
                        # Rasters already exported from QGIS are already in Celsius.
                        if float(np.median(valid_pixels)) > 200:
                            arr[valid_mask] = valid_pixels * 0.00341802 + 149.0 - 273.15
                            valid_pixels = arr[valid_mask]

                        min_v = float(np.min(valid_pixels))
                        max_v = float(np.max(valid_pixels))
                        avg_v = float(np.mean(valid_pixels))

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
                arr, valid_mask, (west, south, east, north) = read_bucharest_raster(ndvi_path)
                valid_pixels=arr[valid_mask]

                if len(valid_pixels)>0:
                        min_v=float(np.min(valid_pixels))
                        max_v=float(np.max(valid_pixels))
                        avg_v=float(np.mean(valid_pixels))

                        total_ndvi = len(valid_pixels)
                        veg_cnt = int(np.sum(valid_pixels > 0.4))
                        veg_pct = round(float((veg_cnt / total_ndvi) * 100), 1) if total_ndvi > 0 else 0.0

                        bins_ndvi = [-np.inf, 0.2, 0.4, 0.6, np.inf]
                        counts_ndvi, _ = np.histogram(valid_pixels, bins=bins_ndvi)
                        pcts_ndvi = np.round((counts_ndvi / total_ndvi) * 100, 1)


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
    title="API - Insula de caldura urbana din Bucuresti",
    description="Date spatiale si statistice pentru Bucuresti",
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
                "lst": "available" if raster_statistics("lst", yr, "all") else "unavailable",
                "ndvi": "available" if raster_statistics("ndvi", yr, "all") else "unavailable"
            },
            "landCover": "available" if land_cover_record(yr, "all") else "unavailable"
        })
    return response

@router.get("/sectors")
def get_sector():
    return [
        {"id": "all", "name": "Tot Bucurestiul", "label": "Tot Bucurestiul"},
        {"id": "1", "name": "Sectorul 1", "label": "Sectorul 1"},
        {"id": "2", "name": "Sectorul 2", "label": "Sectorul 2"},
        {"id": "3", "name": "Sectorul 3", "label": "Sectorul 3"},
        {"id": "4", "name": "Sectorul 4", "label": "Sectorul 4"},
        {"id": "5", "name": "Sectorul 5", "label": "Sectorul 5"},
        {"id": "6", "name": "Sectorul 6", "label": "Sectorul 6"}
    ]

@router.get("/boundaries/sectors")
def get_boundaries_sectors():
    path= "data/bucharest-sectors.geojson"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Limitele GeoJSON nu sunt disponibile")
    with open(path,"r",encoding="utf-8") as f:
        data = json.load(f)

    if data.get("type") == "FeatureCollection":
        return data

    if data.get("type") == "Feature":
        feature = data.copy()
        feature["properties"] = {
            **feature.get("properties", {}),
            "sectorId": "all",
            "name": feature.get("properties", {}).get("name", "Bucuresti"),
        }
        return {"type": "FeatureCollection", "features": [feature]}

    return {"type": "FeatureCollection", "features": []}

@router.get("/map-layers/{layer_id}")
def get_map_layer(layer_id: str, sector: str=Query("all"),year: int =Query(2025),season: str=Query("summer")):
    if layer_id not in ["lst", "ndvi"]:
        raise HTTPException(status_code=404, detail="Strat necunoscut.")

    yr_data=REAL_DATA.get(year,REAL_DATA[2025])
    is_real=yr_data[layer_id]["available"]
    img_file=f"{layer_id}_{year}.png"

    if layer_id == "lst":
        min_v = yr_data["lst"]["min"]
        max_v = yr_data["lst"]["max"]
        return {
            "id": "lst",
            "name": "Temperatura suprafetei (LST)",
            "unit": "°C",
            "description": "Temperatura suprafetei estimata din satelit",
            "year": year,
            "season": season,
            "sectorId": sector,
            "availability": "available" if is_real else "unavailable",
            "isDemo": not is_real,
            "source": {
                "kind": "image",
                "url": f"http://127.0.0.1:8000/static/{img_file}",
                "bounds": yr_data["lst"]["bounds"]
            } if is_real else {"kind": "none"},
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
            "name": "Indicele de vegetatie (NDVI)",
            "unit": "NDVI",
            "description": "Indice spectral al vegetatiei",
            "year": year,
            "season": season,
            "sectorId": sector,
            "availability": "available" if is_real else "unavailable",
            "isDemo": not is_real,
            "source": {
                "kind": "image",
                "url": f"http://127.0.0.1:8000/static/{img_file}",
                "bounds": yr_data["ndvi"]["bounds"]
            } if is_real else {"kind": "none"},
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

# Factori de ajustare per sector fata de media orasului
SECTOR_FACTORS = {
    "all":      {"temp": 0.0,  "ndvi": 0.00},
    "1": {"temp": -1.3, "ndvi": 0.06},  # Mai racoros, parcuri / Herastrau
    "2": {"temp": 0.2,  "ndvi": -0.01},
    "3": {"temp": 1.4,  "ndvi": -0.05},  # Zona mai densa / insula de caldura
    "4": {"temp": 0.7,  "ndvi": -0.02},
    "5": {"temp": 1.1,  "ndvi": -0.04},
    "6": {"temp": -0.5, "ndvi": 0.02},
}

def normalize_celsius(val: float) -> float:
    if val > 200:
        kelvin = val * 0.00341802 + 149.0
        return round(kelvin - 273.15, 2)
    return round(val, 2)

@router.get("/statistics")
def get_statistics(sector: str = Query("all"), year: int = Query(2025), season: str = Query("summer")):
    if year not in YEARS or sector not in {"all", "1", "2", "3", "4", "5", "6"}:
        raise HTTPException(status_code=404, detail="Nu exista date pentru selectia ceruta")
    lst = raster_statistics("lst", year, sector)
    ndvi = raster_statistics("ndvi", year, sector)
    relationship = raster_relationship(year, sector)
    return {
        "sectorId": sector, "year": year, "season": season,
        "avgLst": lst["mean"] if lst else None,
        "minLst": lst["min"] if lst else None,
        "maxLst": lst["max"] if lst else None,
        "avgNdvi": ndvi["mean"] if ndvi else None,
        "minNdvi": ndvi["min"] if ndvi else None,
        "maxNdvi": ndvi["max"] if ndvi else None,
        "hotspotAreaPct": lst["hotspotPct"] if lst else None,
        "hotspotDefinition": f"Procentul pixelilor LST valizi peste percentila 90 a Bucurestiului ({lst['hotspotThresholdC']:.2f} °C) pentru {year}" if lst else None,
        "vegetatedAreaPct": ndvi["vegetatedPct"] if ndvi else None,
        "lstDistribution": lst["distribution"] if lst else [],
        "ndviDistribution": ndvi["distribution"] if ndvi else [],
        "ndviSurfaceBreakdown": ndvi["surfaceBreakdown"] if ndvi else [],
        "ndviVsLst": relationship["samplePoints"] if relationship["available"] else [],
        "lstNdviRelationship": {key: value for key, value in relationship.items() if key != "samplePoints"}
    }

@router.get("/statistics/land-cover")
def get_land_cover(sector: str = Query("all"), year: int = Query(2025), season: str = Query("summer")):
    return land_cover_entries(year, sector)

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

    delta_lst = (round(s_stats["avgLst"] - p_stats["avgLst"], 2)
                 if s_stats["avgLst"] is not None and p_stats["avgLst"] is not None else None)
    delta_ndvi = (round(s_stats["avgNdvi"] - p_stats["avgNdvi"], 3)
                  if s_stats["avgNdvi"] is not None and p_stats["avgNdvi"] is not None else None)
    p_cover = land_cover_entries(req.primaryYear, req.primarySector)
    s_cover = land_cover_entries(sec_year, sec_sector)
    metrics = []
    if delta_lst is not None:
        metrics.append({"id": "avg-lst", "label": "LST mediu", "primary": p_stats["avgLst"],
                        "secondary": s_stats["avgLst"], "delta": delta_lst, "unit": "°C"})
    if delta_ndvi is not None:
        metrics.append({"id": "avg-ndvi", "label": "NDVI mediu", "primary": p_stats["avgNdvi"],
                        "secondary": s_stats["avgNdvi"], "delta": delta_ndvi, "unit": "NDVI"})
    if p_stats["hotspotAreaPct"] is not None and s_stats["hotspotAreaPct"] is not None:
        metrics.append({"id": "hotspot", "label": "Suprafata foarte calda",
                        "primary": p_stats["hotspotAreaPct"], "secondary": s_stats["hotspotAreaPct"],
                        "delta": round(s_stats["hotspotAreaPct"] - p_stats["hotspotAreaPct"], 1),
                        "unit": "percentage points"})
    for category_id, label in (("built-up", "Suprafete construite"), ("trees", "Arbori")):
        p_share = next((entry["percentage"] for entry in p_cover if entry["categoryId"] == category_id), None)
        s_share = next((entry["percentage"] for entry in s_cover if entry["categoryId"] == category_id), None)
        if p_share is not None and s_share is not None:
            metrics.append({"id": category_id, "label": label, "primary": p_share,
                            "secondary": s_share, "delta": round(s_share - p_share, 1), "unit": "percentage points"})
    primary_name = "Bucuresti" if req.primarySector == "all" else f"Sectorul {req.primarySector}"
    secondary_name = "Bucuresti" if sec_sector == "all" else f"Sectorul {sec_sector}"
    series = timeline(req.primarySector) if req.type == "year" else []
    report, comparison_note = comparison_guidance(req.type, p_stats, s_stats, p_cover, s_cover, series)

    return {
        "type": req.type,
        "layer": req.layer,
        "title": (f"{primary_name}: {min(req.primaryYear, sec_year)} - {max(req.primaryYear, sec_year)}"
                  if req.type == "year" else f"{primary_name} fata de {secondary_name}"),
        "context": ("LST si NDVI: date de vara. Land cover: clasificare anuala. " if p_cover and s_cover else
                    "LST si NDVI: date de vara. Land cover lipseste pentru cel putin o selectie. ") + comparison_note,
        "primary": {
            "label": f"{primary_name} · {req.primaryYear}",
            "sectorId": req.primarySector,
            "year": req.primaryYear,
            "season": req.season,
            "statistics": p_stats,
            "landCover": p_cover,
            "mapLayer": p_layer
        },
        "secondary": {
            "label": f"{secondary_name} · {sec_year}",
            "sectorId": sec_sector,
            "year": sec_year,
            "season": req.season,
            "statistics": s_stats,
            "landCover": s_cover,
            "mapLayer": s_layer
        },
        "metrics": metrics,
        "timeline": series,
        "sharedLegend": p_layer["legend"],
        "report": report,
        "isDemo": False
    }

@router.get("/assessment/{year}/{area_code}")
def get_assessment(year: int, area_code: str):
    sector = "all" if area_code in {"bucharest", "all"} else area_code.removeprefix("sector_")
    if year not in YEARS or sector not in {"all", "1", "2", "3", "4", "5", "6"}:
        raise HTTPException(status_code=404, detail="Nu exista evaluare pentru selectia ceruta")
    return assessment(year, sector)

@router.post("/reports/explore")
def post_report(req: ReportReq):
    if req.year not in YEARS or req.sectorId not in {"all", "1", "2", "3", "4", "5", "6"}:
        raise HTTPException(status_code=404, detail="Nu exista raport pentru selectia ceruta")
    return report_for(assessment(req.year, req.sectorId), timeline(req.sectorId))


app.include_router(router,prefix="/api")
app.include_router(router)
