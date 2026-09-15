# Backend

## Despre Backend

Backend-ul aplicatiei Urban Heat Island Bucharest este construit cu FastAPI si se ocupa de procesarea datelor LST, NDVI si Land Cover.

El face legatura dintre fisierele geospatiale, baza de date locala si frontend.

Backend-ul citeste si proceseaza datele, calculeaza statisticile necesare si le pune la dispozitia frontend-ului prin API.

Principalele tehnologii folosite sunt:

- FastAPI;
- Rasterio;
- NumPy;
- SciPy;
- Matplotlib;
- SQLite.

---

## Ce face Backend-ul

Backend-ul se ocupa de:

- citirea rasterelor LST si NDVI;
- validarea valorilor;
- conversia valorilor LST atunci cand este necesar;
- decuparea datelor pentru Bucuresti si cele sase sectoare;
- calcularea statisticilor;
- calcularea hotspot-urilor;
- calcularea relatiei dintre LST si NDVI;
- citirea datelor Land Cover;
- salvarea rezultatelor calculate in SQLite;
- generarea imaginilor folosite pe harta;
- furnizarea datelor prin API;
- comparatiile intre sectoare si ani;
- generarea interpretarilor folosite in Explore.

---

## Arhitectura

Fluxul general al datelor este:

```text
GeoTIFF LST / NDVI       Land Cover       GeoJSON sectoare
          \                  |                  /
           \                 |                 /
                    Backend FastAPI
                          |
                          v
                Procesare si statistici
                          |
                          v
                       SQLite
                          |
                          v
                         API
                          |
                          v
                 Frontend React
                          |
                          v
              Explore / Compare / Harta
```

Rasterele originale raman in fisiere GeoTIFF.

Nu salvam fiecare pixel intr-un tabel SQLite. Baza de date este folosita pentru rezultatele calculate si pentru informatiile necesare aplicatiei.

---

## Pornirea backend-ului

Din radacina repository-ului:

```powershell
./backend/start-backend.cmd
```

Scriptul porneste API-ul la:

```text
http://127.0.0.1:8000
```

Documentatia interactiva FastAPI poate fi accesata la:

```text
http://127.0.0.1:8000/docs
```

Pentru o instalare noua:

```powershell
py -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
./backend/start-backend.cmd
```

---

## Module principale

| Fisier | Rol |
|---|---|
| `main.py` | configurarea FastAPI, endpoint-uri si imaginile pentru harta |
| `assessment.py` | statistici, hotspot-uri, relatie LST-NDVI si timeline |
| `land_cover.py` | citirea si pregatirea datelor Land Cover |
| `database.py` | conexiunea si persistenta SQLite |
| `models.py` | schema tabelelor din baza de date |
| `seed_db.py` | popularea bazei de date din TIFF-uri si JSON |
| `project_guidance.py` | interpretarile bazate pe reguli |
| `scripts/build_land_cover.py` | descarcarea si agregarea Land Cover pe sectoare |
| `data/bucharest-sectors.geojson` | limitele celor sase sectoare |

---

## Endpoint-uri principale

| Metoda | Ruta | Rol |
|---|---|---|
| GET | `/api/years` | returneaza anii disponibili |
| GET | `/api/availability` | verifica disponibilitatea datelor |
| GET | `/api/sectors` | returneaza zonele disponibile |
| GET | `/api/boundaries/sectors` | returneaza limitele sectoarelor |
| GET | `/api/map-layers/{lst\|ndvi}` | returneaza stratul si legenda pentru harta |
| GET | `/api/statistics` | returneaza statisticile LST si NDVI |
| GET | `/api/statistics/land-cover` | returneaza procentele Land Cover |
| GET | `/api/assessment/{year}/{area}` | returneaza evaluarea pentru zona selectata |
| POST | `/api/comparisons` | compara sectoare sau ani |
| POST | `/api/reports/explore` | returneaza interpretarea folosita in Explore |

---

## Procesarea datelor

Rasterele LST si NDVI contin informatia spatiala principala a proiectului.

Backend-ul foloseste Rasterio si NumPy pentru citirea si procesarea lor.

In functie de request, datele sunt analizate pentru:

```text
Tot Bucurestiul
```

sau pentru unul dintre:

```text
Sector 1
Sector 2
Sector 3
Sector 4
Sector 5
Sector 6
```

Pentru fiecare selectie sunt folositi doar pixelii valizi din interiorul zonei analizate.

Rezultatele sunt apoi trimise frontend-ului sub forma de JSON sau sub forma stratului necesar pentru harta.

---

## Procesarea LST

Pentru LST, backend-ul poate calcula:

- temperatura medie;
- temperatura minima;
- temperatura maxima;
- distributia temperaturilor;
- procentul de hotspot;
- diferenta fata de media Bucurestiului.

Daca rasterul Landsat `ST_B10` contine valori scalate, backend-ul aplica conversia necesara pentru obtinerea valorilor in Celsius.

Hotspot-urile sunt definite folosind percentila 90 a valorilor LST valide din Bucuresti pentru anul analizat.

Astfel, pragul este calculat separat pentru fiecare observatie.

---

## Procesarea NDVI

Pentru NDVI, backend-ul poate calcula:

- NDVI mediu;
- NDVI minim;
- NDVI maxim;
- distributia valorilor;
- procentul pixelilor peste pragul folosit in proiect;
- diferenta fata de media Bucurestiului.

Valorile sunt pastrate in intervalul valid:

```text
-1 ... 1
```

NDVI este tratat separat de Land Cover.

Intervalele NDVI nu sunt transformate automat in clase precum cladiri, arbori sau apa.

---

## Relatia dintre LST si NDVI

Pentru anii in care rasterele sunt compatibile, backend-ul poate analiza LST si NDVI impreuna.

Inainte de calcul sunt verificate:

- CRS-ul;
- rezolutia;
- grila raster;
- zona analizata;
- pixelii valizi comuni.

Pentru pixelii compatibili pot fi calculate:

- corelatia Pearson;
- corelatia Spearman;
- contrastul dintre temperaturile asociate unor valori NDVI diferite;
- un esantion de puncte pentru grafic.

O corelatie negativa arata ca valorile NDVI mai mari tind sa coincida cu valori LST mai mici in observatia analizata.

Aceasta este o asociere statistica si nu este prezentata ca relatie de cauzalitate.

---

## Land Cover

Land Cover este procesat separat de LST si NDVI.

LST si NDVI folosesc date Landsat la rezolutie de 30 m, in timp ce Land Cover foloseste o clasificare anuala la 10 m.

Scriptul pentru Land Cover:

1. obtine imaginea corespunzatoare anului;
2. pastreaza clasele folosind nearest-neighbor;
3. decupeaza datele dupa limitele sectoarelor;
4. numara pixelii valizi pentru fiecare clasa;
5. calculeaza procentele;
6. salveaza rezultatele in `landcover-summary.json`.

Pentru reconstruirea datelor Land Cover:

```powershell
./backend/.venv/Scripts/python.exe backend/scripts/build_land_cover.py --download
```

Clasele pot include:

- suprafete construite;
- arbori;
- vegetatie joasa;
- culturi;
- apa;
- sol.

Clasa `Suprafete construite` poate include si drumuri.

Land Cover este folosit ca informatie de context si nu descrie dreptul de construire sau situatia exacta a unei parcele.

---

## Baza de date

Backend-ul foloseste o baza de date locala SQLite.

Fisierul este:

```text
backend/uhi_data.db
```

In baza de date sunt salvate rezultatele calculate din rasterele LST si NDVI si datele Land Cover.

Rasterele complete nu sunt introduse in SQLite.

Structura este:

```text
GeoTIFF / JSON
      |
      v
Procesare Backend
      |
      v
   SQLite
      |
      v
     API
```

La urmatoarea pornire, rezultatele care nu s-au schimbat pot fi citite direct din baza de date, fara recalcularea completa a datelor.

Backend-ul verifica si semnatura fisierului sursa. Daca un TIFF sau fisierul JSON se modifica, rezultatele corespunzatoare pot fi recalculate.

---

## Ce se salveaza in SQLite

Baza de date poate contine:

- media, minimul si maximul LST;
- distributia LST;
- procentul de hotspot;
- media, minimul si maximul NDVI;
- distributia NDVI;
- procentul pixelilor NDVI peste `0.4`;
- corelatiile Pearson si Spearman;
- datele necesare graficului LST-NDVI;
- procentele Land Cover;
- anul sursei Land Cover;
- numarul pixelilor valizi;
- informatii despre fisierele sursa.

Aceasta abordare evita recalcularea inutila a acelorasi statistici.

---

## Generarea bazei de date

Pentru generarea combinatiilor disponibile inainte de pornirea API-ului poate fi folosit:

```powershell
.\backend\seed-db.cmd
```

Fisierul:

```text
uhi_data.db
```

este local si nu este urcat pe GitHub.

In repository sunt pastrate schema bazei de date si scripturile necesare pentru generarea ei.

Astfel, fiecare membru al echipei poate genera baza locala folosind fisierele TIFF disponibile si datele Land Cover.

---

## Anii disponibili

Aplicatia foloseste selectiile:

```text
2015
2018
2020
2023
2025
```


---

## Cache

Unele rezultate sunt pastrate temporar in memorie folosind `lru_cache`.

Acest lucru reduce procesarea repetata atunci cand utilizatorul schimba intre Explore si Compare sau revine la o selectie deja analizata.

SQLite si cache-ul din memorie au roluri diferite:

- SQLite pastreaza rezultatele calculate intre pornirile aplicatiei;
- `lru_cache` evita repetarea unor operatii in timpul aceleiasi sesiuni a backend-ului.

---

## Explore si datele istorice

Pentru 2025, backend-ul poate furniza datele necesare pentru contextul temporal LST si NDVI folosind observatiile disponibile:

```text
2015 -> 2018 -> 2020 -> 2023 -> 2025
```

Anii anteriori sunt folositi ca repere istorice.

Pentru o selectie istorica, backend-ul poate furniza si comparatia cu 2025, astfel incat frontend-ul sa poata prezenta diferenta fata de observatia cea mai recenta.

Aceste diferente sunt descriptive si nu sunt tratate automat ca efectul unei anumite schimbari urbane.

---

## Compare

Backend-ul ofera datele necesare pentru doua tipuri principale de comparatie:

### Doua sectoare

```text
Sector A - acelasi an
vs
Sector B - acelasi an
```

### Acelasi sector in doi ani

```text
Sector A - anul 1
vs
Sector A - anul 2
```

Pentru fiecare comparatie sunt returnate doar valorile disponibile si compatibile.


---

## Interpretari si rapoarte

Backend-ul poate genera interpretari scurte pe baza valorilor calculate.

Logica se afla in:

```text
project_guidance.py
```

Interpretarile sunt bazate pe reguli si folosesc date precum:

- LST;
- NDVI;
- hotspot-uri;
- diferente fata de Bucuresti;
- Land Cover;
- comparatii temporale.

Nu este folosit un LLM pentru generarea acestor texte.

Pentru anii istorici, interpretarea poate folosi 2025 ca reper.

Pentru 2025, interpretarea se concentreaza pe situatia observata si pe elementele care merita verificate mai departe.

Recomandarile nu includ estimari fabricate despre reducerea temperaturii sau a poluarii.

---

## Date lipsa

Daca o sursa nu este disponibila, backend-ul nu trebuie sa returneze valori inventate.

De exemplu, lipsa Land Cover pentru o anumita selectie nu trebuie reprezentata prin:

```json
{
  "built_up_pct": 0
}
```

daca valoarea reala nu este cunoscuta.

API-ul trebuie sa permita frontend-ului sa diferentieze intre:

```text
valoare reala = 0
```

si:

```text
valoare indisponibila
```

Aceasta regula este folosita si pentru LST, NDVI si comparatiile dintre ani.

---

## Verificare

Dupa pornirea backend-ului poate fi verificata documentatia FastAPI:

```text
http://127.0.0.1:8000/docs
```

Pentru o verificare de baza trebuie testate:

- `/api/years`;
- `/api/availability`;
- `/api/sectors`;
- `/api/statistics`;
- `/api/statistics/land-cover`;
- un strat LST;
- un strat NDVI;
- comparatia intre doua sectoare;
- comparatia intre doi ani;
- raspunsul pentru Explore.

Pentru verificarea completa trebuie testate atat datele disponibile, cat si cazurile in care anumite fisiere lipsesc.

---
