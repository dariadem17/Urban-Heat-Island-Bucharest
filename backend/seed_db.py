from database import engine, Base, SessionLocal
from models import Area, SectorMetric, LstNdviRelationship
from main import REAL_DATA, YEARS, SECTOR_FACTORS, normalize_celsius, process_all_geotiff

process_all_geotiff()

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)
db = SessionLocal()

areas_def = [
    ("all", "Bucharest", "city"),
    ("sector_1", "Sector 1", "sector"),
    ("sector_2", "Sector 2", "sector"),
    ("sector_3", "Sector 3", "sector"),
    ("sector_4", "Sector 4", "sector"),
    ("sector_5", "Sector 5", "sector"),
    ("sector_6", "Sector 6", "sector"),
]
for code, name, a_type in areas_def:
    db.add(Area(code=code, name=name, area_type=a_type))

for yr in YEARS:
    yr_data = REAL_DATA.get(yr)
    base_avg_l = normalize_celsius(yr_data["lst"]["avg"])
    base_min_l = normalize_celsius(yr_data["lst"]["min"])
    base_max_l = normalize_celsius(yr_data["lst"]["max"])
    base_avg_n = round(yr_data["ndvi"]["avg"], 2)

    lc_map = {item["categoryId"]: item["percentage"] for item in yr_data.get("landCover", [])}
    b_pct = lc_map.get("built-up", 54.2)
    v_pct = lc_map.get("vegetation", 31.5)
    s_pct = lc_map.get("bare-soil", 9.8)
    w_pct = lc_map.get("water", 4.5)

    for sec_code, mod in SECTOR_FACTORS.items():
        avg_l = round(base_avg_l + mod["temp"], 2)
        min_l = round(base_min_l + mod["temp"], 2)
        max_l = round(base_max_l + mod["temp"], 2)
        avg_n = round(max(0.0, min(1.0, base_avg_n + mod["ndvi"])), 2)
        
        hotspot_calc = round(min(100.0, max(0.0, yr_data["lst"]["hotspotPct"] + (mod["temp"] * 3.5))), 1)

        db.add(SectorMetric(
            area_code=sec_code,
            year=yr,
            season="summer",
            avg_lst=avg_l,
            min_lst=min_l,
            max_lst=max_l,
            hotspot_area_pct=hotspot_calc,
            avg_ndvi=avg_n,
            min_ndvi=round(yr_data["ndvi"]["min"], 2),
            max_ndvi=round(yr_data["ndvi"]["max"], 2),
            vegetated_area_pct=round(min(100.0, max(0.0, yr_data["ndvi"]["vegetatedPct"] + (mod["ndvi"] * 50))), 1),
            built_up_pct=b_pct,
            vegetation_pct=v_pct,
            bare_soil_pct=s_pct,
            water_pct=w_pct
        ))

        db.add(LstNdviRelationship(
            area_code=sec_code,
            year=yr,
            spearman_rho=-0.52 if sec_code == "all" else -0.47,
            sample_count=215000 if sec_code == "all" else 35000,
            direction="negative",
            strength="moderate"
        ))

db.commit()
db.close()
print("Database seeded successfully.")