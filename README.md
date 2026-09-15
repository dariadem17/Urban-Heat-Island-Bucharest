# Urban Heat Island Bucharest

Aplicatie web pentru explorarea insulei de caldura urbana din Bucuresti. Proiectul combina temperatura suprafetei (LST), indicele de vegetatie (NDVI), acoperirea terenului (Land Cover) si limitele celor sase sectoare intr-un instrument vizual destinat evaluarii initiale a unui amplasament urban.

Aplicatia raspunde la trei intrebari simple:

1. Unde apar suprafetele mai calde in Bucuresti?
2. Cum se asociaza vegetatia cu temperatura suprafetei?
3. Ce semnale din date merita verificate de un dezvoltator inainte de proiectare?

Proiectul este un instrument de screening. El ajuta la prioritizarea verificarilor, dar nu inlocuieste studiul unei parcele, proiectarea tehnica sau analiza de mediu.

## Demonstratie rapida

### 1. Pornirea backend-ului

Din radacina proiectului, in PowerShell:

```powershell
./backend/start-backend.cmd
```

API-ul va fi disponibil la `http://127.0.0.1:8000`, iar documentatia interactiva la `http://127.0.0.1:8000/docs`.

Daca mediul virtual nu exista inca:

```powershell
py -m venv backend/.venv
./backend/.venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

### 2. Pornirea frontend-ului

Intr-un al doilea terminal:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Deschide adresa afisata de Vite, de regula `http://localhost:5173`.

## Cele patru parti ale proiectului

| Parte | Intrebarea rezolvata | Rezultat principal | Documentatie |
|---|---|---|---|
| LST | Unde sunt suprafetele mai calde? | Rastru termic, statistici si hotspoturi | [docs/LST.md](docs/LST.md) |
| NDVI | Unde exista un semnal mai puternic de vegetatie? | Rastru NDVI, distributii si relatia cu LST | [docs/NDVI.md](docs/NDVI.md) |
| Backend | Cum transformam rasterele in date utilizabile? | API, statistici zonale, comparatii si rapoarte | [backend/README.md](backend/README.md) |
| Frontend | Cum devin datele usor de inteles? | Harta, Explore, Compare, grafice si interpretari | [frontend/README.md](frontend/README.md) |

Aceasta impartire poate reprezenta direct cele patru contributii ale echipei. Numele membrilor pot fi completate aici:

| Membru | Responsabilitate principala |
|---|---|
| Membru 1 | LST |
| Membru 2 | NDVI |
| Membru 3 | Backend |
| Membru 4 | Frontend si integrarea Land Cover in produs |

Land Cover nu trebuie prezentat ca o a cincea parte. Conceptual, el este contextul care ajuta Frontend-ul sa explice de ce doua zone pot avea profiluri diferite. Tehnic, procentele sunt pregatite si servite de Backend. In acest fel, contributia poate fi atribuita persoanei care a realizat integrarea vizuala, cu mentiunea ca pipeline-ul este comun cu Backend-ul.

## Reasoning-ul proiectului

### De la harta la o decizie

O harta termica este usor de privit, dar nu spune singura ce inseamna o zona pentru un proiect nou. De aceea, aplicatia foloseste mai multe niveluri de informatie:

```text
LST -> intensitatea termica a suprafetei
NDVI -> semnalul spectral asociat vegetatiei
Land Cover -> tipurile de acoperire a terenului
Limite sector -> agregare si comparatie geografica
        |
        v
Statistici + evolutie + interpretare pentru proiect
```

LST si NDVI sunt analizate impreuna la nivel de pixeli aliniati. Land Cover ramane o clasificare separata, folosita ca explicatie suplimentara. Aceasta separare evita interpretarea gresita a intervalelor NDVI drept cladiri, apa sau arbori.

### De ce comparam sectorul cu orasul

Temperaturile absolute pot varia mult intre observatii de vara. Pentru evolutia in timp, aplicatia arata si diferenta dintre un sector si media Bucurestiului din acelasi an. Un sector care ramane mai cald si cu NDVI mai mic in mai multi ani ofera un semnal mai util pentru screening decat o singura valoare izolata.

Anii 2015, 2018, 2020 si 2023 sunt tratati ca repere istorice. Recomandarile de proiect sunt formulate pentru situatia recenta, folosind 2025 si persistenta semnalului din anii anteriori. Seria nu este o prognoza numerica.

### Reguli de credibilitate

- LST inseamna temperatura suprafetei, nu temperatura aerului.
- Asocierea dintre NDVI si LST nu demonstreaza cauzalitate.
- Procentele Land Cover descriu orasul sau sectorul, nu o parcela.
- Clasa construita include si drumuri.
- Hotspoturile folosesc percentila 90 a pixelilor LST din Bucuresti pentru acelasi an.
- Recomandarile sunt conditionale si cer verificare la fata locului.
- Aplicatia nu estimeaza reducerea poluarii sau efectul in grade al unui parc viitor.

## Date disponibile

| Set | Ani | Rezolutie / perioada | Observatie |
|---|---|---|---|
| LST | 2015, 2018, 2020, 2023, 2025 | rastere georeferentiate | observatii de vara; unitatea finala este Celsius |
| NDVI | 2015, 2018, 2020, 2023, 2025 | Landsat 8, 30 m | metadatele livrate descriu cate o scena din august |
| Land Cover | 2018, 2020, 2023, 2025 | Sentinel-2, 10 m, anual | clasificare Esri / Impact Observatory / Microsoft |
| Limite | sase sectoare | GeoJSON WGS84 | folosite pentru contururi si statistici zonale |

Pentru comparatii stiintifice finale trebuie confirmat ca metoda de pregatire LST este consecventa intre toti anii. Metadatele NDVI din proiect indica scene individuale, nu o medie iunie-august.

## Arhitectura

```text
GeoTIFF LST / NDVI       GeoTIFF Land Cover       GeoJSON sectoare
         |                       |                       |
         +-----------------------+-----------------------+
                                 |
                    Python + Rasterio + NumPy
                                 |
                 FastAPI: statistici, comparatii, raport
                                 |
                      React + TypeScript + MapLibre
                                 |
                  Explore / Compare / recomandari
```

Rasterele raman fisiere geospatiale. Backend-ul calculeaza statisticile si trimite JSON plus imagini georeferentiate catre browser. Arhitectura poate primi ulterior o baza de date pentru metadate si rezultate precomputate fara schimbarea contractului frontend.

## Functionalitati

- harta LST sau NDVI pentru Bucuresti si fiecare sector;
- contururile tuturor sectoarelor si evidentierea zonei selectate;
- medie, minim, maxim, distributii si ponderea hotspoturilor;
- statistici Land Cover pentru anii disponibili;
- relatie spatiala LST-NDVI prin Pearson si Spearman;
- comparatie intre sectoare sau intre ani pentru acelasi sector;
- evolutie fata de media orasului;
- raport scurt cu semnale si actiuni de verificat pentru dezvoltare.

## Startup angle

Produsul poate evolua intr-o platforma B2B de **environmental site screening** pentru dezvoltatori imobiliari, birouri de arhitectura si consultanti urbanistici.

Problema comerciala este fragmentarea verificarilor initiale: un dezvoltator compara terenuri, dar informatia despre expunerea termica, vegetatie si context construit se afla in surse diferite si necesita specialisti GIS. Aplicatia reduce timpul primei evaluari si indica unde merita comandate investigatii detaliate.

Un produs comercial ar putea oferi:

- raport automat pentru o parcela incarcata de utilizator;
- comparatie cu sectorul si zone similare;
- istoric multi-anual si monitorizare dupa construire;
- export PDF pentru due diligence si discutii cu proiectantii;
- scenarii de amenajare validate prin modele suplimentare;
- abonament pentru portofolii de proprietati si API pentru companii.

Clientul nu cumpara o simpla harta, ci un raspuns mai rapid la intrebarea: **ce riscuri termice si ce oportunitati de infrastructura verde trebuie investigate inainte sa investim in acest amplasament?**

## Structura repository-ului

```text
backend/
  data/                  rastere locale, Land Cover sumarizat, limite
  scripts/               reconstruirea datelor Land Cover
  assessment.py          analiza raster si relatia LST-NDVI
  project_guidance.py    interpretari deterministe
  main.py                API FastAPI si imagini pentru harta

frontend/
  public/data/           fallback pentru limitele sectoarelor
  src/components/        harta, controale, grafice, raport, comparatie
  src/services/          adaptor API si mod demonstrativ
  src/types/             contractele TypeScript
```

Documentatia tehnica detaliata se afla si in [ASSESSMENT_DATA_CONTRACT.md](ASSESSMENT_DATA_CONTRACT.md), [backend/REPORTING.md](backend/REPORTING.md) si [frontend/BACKEND_CONTRACT.md](frontend/BACKEND_CONTRACT.md).
