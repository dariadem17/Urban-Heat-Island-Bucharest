# Backend

Backend-ul transforma fisierele geospatiale in date coerente pentru harta, grafice, comparatii si rapoarte. Este construit cu FastAPI, Rasterio, NumPy, SciPy si Matplotlib.

## Responsabilitati

- citirea rasterelor LST si NDVI;
- conversia si validarea valorilor;
- decuparea pe Bucuresti si pe cele sase sectoare;
- statistici zonale si distributii;
- calcularea relatiei LST-NDVI;
- citirea procentelor Land Cover precompute;
- generarea imaginilor georeferentiate pentru harta;
- API pentru Explore si Compare;
- interpretari deterministe pentru dezvoltatori.

## Pornire

Din radacina repository-ului:

```powershell
./backend/start-backend.cmd
```

Scriptul intra automat in directorul corect si porneste API-ul la `http://127.0.0.1:8000`. Documentatia interactiva se afla la `http://127.0.0.1:8000/docs`.

Pentru o instalare noua:

```powershell
py -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
./backend/start-backend.cmd
```

## Module

| Fisier | Rol |
|---|---|
| `main.py` | configurarea FastAPI, endpoint-uri, procesarea imaginilor pentru harta |
| `assessment.py` | pixeli, statistici, hotspoturi, relatie LST-NDVI si timeline |
| `land_cover.py` | adaptor pentru sumarul anual Land Cover |
| `project_guidance.py` | interpretari si recomandari bazate pe reguli |
| `scripts/build_land_cover.py` | descarcare si agregare Land Cover pe sectoare |
| `data/bucharest-sectors.geojson` | limitele celor sase sectoare |

## Endpoint-uri principale

| Metoda | Ruta | Scop |
|---|---|---|
| GET | `/api/years` | anii disponibili |
| GET | `/api/availability` | disponibilitatea fiecarui strat |
| GET | `/api/sectors` | lista zonelor |
| GET | `/api/boundaries/sectors` | limite GeoJSON |
| GET | `/api/map-layers/{lst\|ndvi}` | imagine si legenda pentru harta |
| GET | `/api/statistics` | statistici LST, NDVI si relatie |
| GET | `/api/statistics/land-cover` | procente Land Cover |
| GET | `/api/assessment/{year}/{area}` | evaluare structurata |
| POST | `/api/comparisons` | comparatie sector/an si timeline |
| POST | `/api/reports/explore` | raport scurt pentru Explore |

## Reasoning tehnic

Rasterele contin dovada spatiala si raman in GeoTIFF. API-ul trimite browserului doar ce are nevoie: o imagine pentru overlay, limite GeoJSON si statistici JSON. Aceasta alegere evita stocarea fiecarui pixel intr-o baza relationala si pastreaza calculele reproductibile.

Rezultatele costisitoare sunt memorate in proces cu `lru_cache`. La nivel de prototip, aceasta reduce citirile repetate atunci cand utilizatorul schimba intre Explore si Compare.

Rapoartele sunt deterministe. Textul este ales din reguli care citesc LST, NDVI, hotspoturile si Land Cover. Nu este folosit un LLM si nu sunt inventate valori. Pentru anii istorici, raportul compara cu 2025; pentru 2025, ofera actiuni conditionale de verificat in proiect.

## Land Cover in Backend

Land Cover este procesat ca un set separat deoarece este o clasificare anuala la 10 m, in timp ce LST si NDVI sunt rastere de vara la 30 m. Scriptul:

1. obtine imaginea anuala corecta din serviciul Esri;
2. pastreaza clasele prin nearest-neighbor;
3. decupeaza dupa limitele sectoarelor;
4. numara pixelii valizi pe clasa;
5. scrie procentele si hash-urile in `landcover-summary.json`.

Rebuild optional:

```powershell
./backend/.venv/Scripts/python.exe backend/scripts/build_land_cover.py --download
```

Ani disponibili: 2018, 2020, 2023 si 2025. Clasa `Suprafete construite` include drumuri. Land Cover nu este o medie a verii si nu descrie dreptul de construire al unei parcele.

## Baza de date

Versiunea curenta ruleaza direct din GeoTIFF, GeoJSON si JSON-ul Land Cover. Acest lucru este suficient pentru demo si pastreaza sursa calculelor vizibila. O baza SQLite sau PostgreSQL/PostGIS poate stoca ulterior:

- metadatele seturilor de date;
- statisticile precompute;
- provenienta si versiunile metodelor;
- rezultate pentru parcele si utilizatori.

Contractul API permite aceasta schimbare fara rescrierea frontend-ului.

## Verificare

Porneste API-ul si verifica `/docs`, `/api/years`, o selectie `/api/statistics` si ambele tipuri de `/api/comparisons`.

## Contributia membrului Backend

Pentru prezentarea echipei, aceasta parte poate include: proiectarea contractului API, integrarea rasterelor, statistici zonale, caching, endpoint-uri, corelatii, comparatii temporale, rapoarte deterministe si integrarea tehnica Land Cover.

## Referinte pentru Land Cover

- [Esri Living Atlas - Sentinel-2 10 m Land Cover](https://livingatlas.arcgis.com/landcover/)
- [Google Earth Engine - colectii Sentinel](https://developers.google.com/earth-engine/datasets/catalog/sentinel)
