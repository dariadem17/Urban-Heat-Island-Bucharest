from sqlalchemy import Column, Integer, Float, String, Boolean
from database import Base

class Area(Base):
    __tablename__ = "areas"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True) 
    name = Column(String)
    area_type = Column(String)                      

class SectorMetric(Base):
    __tablename__ = "sector_metrics"
    id = Column(Integer, primary_key=True, index=True)
    area_code = Column(String, index=True)
    year = Column(Integer, index=True)
    season = Column(String, default="summer")
    
    # LST
    avg_lst = Column(Float)
    min_lst = Column(Float)
    max_lst = Column(Float)
    hotspot_area_pct = Column(Float)
    
    # NDVI
    avg_ndvi = Column(Float)
    min_ndvi = Column(Float)
    max_ndvi = Column(Float)
    vegetated_area_pct = Column(Float)
    
    # Land Cover
    built_up_pct = Column(Float)
    vegetation_pct = Column(Float)
    bare_soil_pct = Column(Float)
    water_pct = Column(Float)

class LstNdviRelationship(Base):
    __tablename__ = "lst_ndvi_relationship"
    id = Column(Integer, primary_key=True, index=True)
    area_code = Column(String, index=True)
    year = Column(Integer, index=True)
    spearman_rho = Column(Float, default=-0.48)
    sample_count = Column(Integer, default=35000)
    direction = Column(String, default="negative")
    strength = Column(String, default="moderate")