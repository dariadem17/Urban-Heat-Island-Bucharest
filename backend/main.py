import random
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app=FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static",StaticFiles(directory="static"),name="static")

@app.get("/api/layers/{year}/{type}")
def get_layer(year: int, type: str):
    bbox_bucharest=[[44.3355,25.9522],[44.5421,26.2411]]
    return {
        "year": year,
        "type": type,
        "imageUrl": f"http://127.0.0.1:8000/static/{type}_dummy.png",
        "bounds": bbox_bucharest
    }

@app.get("/api/inspect")
def inspect_point(lat:float,lng: float,year:int=2024):
    return {
        "lat": lat,
        "lng": lng,
        "year": year,
        "lst": round(random.uniform(26.0,38,0),1),
        "ndvi": round(random.uniform(0.1,0.6),2),
    }

@app.get("/api/stats/history")
def get_sector_history(sector: str="all"):
    return {
        "sector": sector,
        "evolution": [
            {"year": 2020, "avg_temp": 28.5, "vegetation": 31.0, "water": 4.5},
            {"year": 2022, "avg_temp": 30.2, "vegetation": 28.4, "water": 4.3},
            {"year": 2024, "avg_temp": 32.1, "vegetation": 25.0, "water": 4.0}
        ]
    }

import json

@app.get("/api/sectoare")
def get_sectoare():
    with open ("bucharest.geojson","r",encoding="utf-8") as f:
        data=json.load(f)
    return data