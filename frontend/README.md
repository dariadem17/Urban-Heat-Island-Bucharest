# Frontend

Frontend-ul transforma datele geospatiale si statistice intr-o experienta usor de folosit de un dezvoltator imobiliar. Este construit cu React, TypeScript, Vite, Tailwind CSS, MapLibre GL, Recharts si TanStack Query.

## Obiectiv

Interfata nu incearca sa reproduca un software GIS. Ea organizeaza informatia in doua fluxuri:

- **Exploreaza** pentru intelegerea unei zone si a unui an;
- **Compara** pentru diferente intre doua sectoare sau evolutia aceluiasi sector intre ani.

## Pornire

Backend-ul trebuie pornit pe `127.0.0.1:8000`.

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Configuratia API:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Pentru o demonstratie fara backend, elimina `.env` sau seteaza `VITE_DATA_MODE=demo`. In acest mod, valorile sunt marcate drept demonstrative.

## Tehnologii si motivatia lor

| Tehnologie | De ce a fost folosita |
|---|---|
| React + TypeScript | componente reutilizabile si contracte clare pentru date |
| Vite | dezvoltare si build rapid |
| Tailwind CSS | layout responsiv si stil vizual coerent |
| MapLibre GL | overlay-uri georeferentiate si limite vectoriale interactive |
| Recharts | grafice comparative si distributii usor de citit |
| TanStack Query | incarcare, cache si stari de eroare pentru API |

## Componente principale

| Componenta | Rol |
|---|---|
| `ControlPanel` | sector, an, strat si opacitate |
| `MapPanel` | basemap, LST/NDVI si contururile sectoarelor |
| `AnalyticsPanel` | indicatorii principali |
| `ChartPanel` | distributii, Land Cover si relatia LST-NDVI |
| `InsightsPanel` | raportul pentru Explore |
| `ComparisonPanel` | harti, metrici, grafice si interpretare comparativa |

Serviciile din `src/services/` separa interfata de sursa datelor. `apiService.ts` consuma FastAPI, iar `mockApi.ts` mentine aplicatia demonstrabila atunci cand backend-ul nu este disponibil.

## Reasoning de produs

Ordinea informatiei urmareste intrebarile unui utilizator care vede aplicatia pentru prima data:

1. Ce zona si ce strat privesc?
2. Unde este limita exacta a sectorului?
3. Care sunt cifrele principale?
4. Cum sunt distribuite valorile?
5. Ce spun LST, NDVI si Land Cover impreuna?
6. Ce merita verificat intr-un proiect actual?

Detaliile repetitive despre metoda au fost reduse in interfata. Graficele pastreaza cifrele, iar raportul explica legaturile si formuleaza actiuni concrete, dar conditionale.

## Exploreaza

Pentru 2025, raportul pune accent pe situatia curenta si pe actiuni precum pastrarea arborilor, umbrirea traseelor pietonale, reducerea pavajului expus sau verificarea fezabilitatii unui acoperis verde.

Pentru anii anteriori, interfata nu ofera sfaturi ca si cum proiectul ar fi realizat in trecut. Anul selectat este prezentat ca reper si comparat cu 2025.

## Compara

Utilizatorul poate compara:

- doua sectoare in acelasi an;
- acelasi sector in doi ani.

Comparatia temporala include toate observatiile disponibile si arata pozitia sectorului fata de media orasului. Linia zero este media Bucurestiului din anul respectiv. Acest design face vizibila persistenta unui semnal fara a prezenta seria drept prognoza.

## Land Cover in Frontend

Land Cover este inclus in contributia Frontend deoarece aici devine util pentru utilizator:

- clasele sunt prezentate cu denumiri clare;
- barele compara ponderea terenului construit, arborilor, vegetatiei joase, culturilor, apei si solului;
- valorile sunt legate de LST si NDVI in interpretare;
- componenta apare ca analiza, nu ca strat selectabil pe harta.

Procesarea numerica este facuta in Backend. Frontend-ul nu inventeaza valori lipsa si nu transforma intervalele NDVI in clase Land Cover.

## Harta si limitele sectoarelor

MapLibre afiseaza toate granitele sectoriale peste overlay. Sectorul selectat primeste un contur mai vizibil, iar restul limitelor raman subtile. Aceeasi regula este aplicata in Explore si pe ambele harti din Compare.

Stratul raster este adaugat numai dupa incarcarea stilului hartii. Aceasta ordine evita eroarea MapLibre `Style is not done loading`.

## Rapoarte

Frontend-ul primeste interpretarea de la backend si afiseaza:

- diagnosticul principal;
- semnalul temporal, cand exista;
- doua sau trei actiuni usor de parcurs;
- o nota scurta despre nivelul datelor.

Nu sunt afisate estimari fabricate precum reducerea LST cu un anumit numar de grade sau reducerea poluarii cu un procent.

## Build si verificare

```powershell
cd frontend
npm run lint
npm run build
npm run preview
```

## Contributia membrului Frontend

Pentru prezentarea echipei, aceasta parte poate include: arhitectura componentelor, designul responsiv, integrarea MapLibre, contururile sectoarelor, graficele Recharts, fluxurile Explore/Compare, tratarea erorilor, traducerea in romana si integrarea vizuala Land Cover.
