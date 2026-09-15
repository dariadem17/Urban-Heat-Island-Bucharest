# Local GeoTIFF data

Place the local raster files in this directory. The backend expects these exact names:

- `lst_2015.tif`
- `lst_2018.tif`
- `lst_2020.tif`
- `lst_2023.tif`
- `lst_2025.tif`
- `ndvi_2015.tif`
- `ndvi_2018.tif`
- `ndvi_2020.tif`
- `ndvi_2023.tif`
- `ndvi_2025.tif`

The files must be valid single-band GeoTIFF rasters with a defined CRS and georeferencing. TIFF files are intentionally ignored by Git and remain local.

Start the API from the `backend` directory so its relative `data/` and `static/` paths resolve correctly.

## Annual land cover

`landcover-summary.json` contains derived class percentages for Bucharest and sectors 1-6 in 2018, 2020, 2023 and 2025. The source is the [Esri / Impact Observatory / Microsoft Sentinel-2 10 m annual land-cover series](https://livingatlas.arcgis.com/landcover/) under CC BY 4.0. The script `backend/scripts/build_land_cover.py --download` exports the correct annual image by catalogue ID, clips statistics to the local sector GeoJSON, and rebuilds the JSON. The large `landcover_YEAR.tif` files are ignored by Git. The 2015 dashboard selection has no corresponding image in this series.

Land cover is an annual classification, not a summer average. Its built-up class includes roads, and sector percentages must not be interpreted as parcel measurements or planning permission. The NDVI surface-signal ranges remain a separate fallback when land cover is unavailable.
