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
