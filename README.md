# Urban Heat Island (UHI) Bucharest — Backend API

FastAPI backend developed for screening and analyzing the Urban Heat Island effect across Bucharest using Landsat Collection 2 Level-2 satellite observations.

---

## Prerequisites

* Python 3.10+
* GeoTIFF raster assets placed inside the `backend/data/` directory:
  * `lst_{year}.tif` (Landsat Surface Temperature Band)
  * `ndvi_{year}.tif` (Surface Reflectance-derived NDVI)
  * Supported target years: `2015`, `2018`, `2020`, `2023`, `2025`

---

## Setup & Execution

### 1. Install Dependencies

Install the required Python packages:

```powershell
pip install fastapi uvicorn sqlalchemy rasterio matplotlib numpy
```

### 2. Seed Database

Navigate to the `backend` folder and populate SQLite:

```powershell
cd backend
py seed_db.py
```

### 3. Start Backend Server

Launch the Uvicorn server:

```powershell
py -m uvicorn main:app --reload --port 8000
```

---

## Key Endpoints

* **Interactive Swagger UI:** `http://127.0.0.1:8000/docs`
* **Sector & City Statistics:** `GET /api/statistics?sector={sector_id}&year={year}`
* **Map Layer Metadata & Legends:** `GET /api/map-layers/{layer_id}?sector={sector_id}&year={year}`
* **Descriptive Climate Assessment:** `POST /api/reports/explore`
* **Direct Sector Assessment:** `GET /api/assessment/{year}/{area_code}`
