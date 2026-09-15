# Frontend

## Despre Frontend

Frontend-ul este partea interactiva a aplicatiei Urban Heat Island Bucharest.

Aici sunt afisate hartile LST si NDVI, statisticile pentru Bucuresti si cele sase sectoare, graficele, datele Land Cover si comparatiile dintre zone sau ani.

Frontend-ul este construit cu React si TypeScript si comunica cu backend-ul FastAPI pentru obtinerea datelor.

Principalele tehnologii folosite sunt:

- React;
- TypeScript;
- Vite;
- Tailwind CSS;
- MapLibre GL;
- Recharts;
- TanStack Query.

---

## Structura aplicatiei

Aplicatia este impartita in doua moduri principale:

### Explore

Explore este modul principal pentru analiza unei zone.

Utilizatorul poate selecta:

- Bucuresti sau unul dintre cele sase sectoare;
- anul;
- stratul LST sau NDVI;
- opacitatea stratului de pe harta.

Pentru selectia curenta sunt afisate harta, statisticile si graficele disponibile.

### Compare

Compare este folosit pentru comparatii intre doua selectii.

Utilizatorul poate compara:

- doua sectoare pentru acelasi an;
- acelasi sector pentru doi ani diferiti.

Astfel, Explore este folosit pentru analiza unei selectii, iar Compare pentru observarea diferentelor dintre doua zone sau doua momente.

---

## Anii disponibili

Aplicatia foloseste date pentru:

```text
2015
2018
2020
2023
2025
```

Anul 2025 este folosit ca observatia cea mai recenta, iar anii anteriori sunt folositi ca repere istorice.

Pentru selectia 2025 din Explore este afisat si contextul temporal folosind observatiile disponibile:

```text
2015 -> 2018 -> 2020 -> 2023 -> 2025
```

Pentru un sector, graficele permit urmarirea valorilor LST si NDVI si raportarea lor la media Bucurestiului.

Pentru selectia `Tot Bucurestiul`, sunt afisate valorile orasului pentru observatiile disponibile.

Cand utilizatorul selecteaza un an istoric, interfata se concentreaza pe datele acelui an. Anul respectiv poate fi folosit apoi ca reper pentru comparatia cu 2025.

Seria istorica nu reprezinta o prognoza si nici o serie continua de masuratori. Fiecare an reprezinta o observatie separata din datele disponibile in proiect.

---

## Pornirea frontend-ului

Backend-ul trebuie sa ruleze pe:

```text
http://127.0.0.1:8000
```

Din directorul proiectului:

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Configuratia pentru API este:

```env
VITE_DATA_MODE=api
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Frontend-ul ruleaza de obicei pe:

```text
http://localhost:5173
```

---

## Modul demo

Frontend-ul poate fi pornit si fara backend folosind modul demo.

Pentru acest mod se poate elimina fisierul `.env` sau se poate seta:

```env
VITE_DATA_MODE=demo
```

Modul demo a fost folosit pentru dezvoltarea si testarea interfetei atunci cand backend-ul sau datele reale nu erau disponibile.

Valorile din acest mod trebuie tratate ca date demonstrative, nu ca rezultate reale ale analizei.

---

## Tehnologii folosite

| Tehnologie | Rol in proiect |
|---|---|
| React + TypeScript | componentele si logica interfetei |
| Vite | rularea si build-ul aplicatiei |
| Tailwind CSS | stilizare si layout responsive |
| MapLibre GL | harta si overlay-urile georeferentiate |
| Recharts | grafice, distributii si comparatii |
| TanStack Query | request-uri catre API, cache si tratarea starilor de incarcare |

---

## Componente principale

Frontend-ul este impartit in componente separate pentru harta, controale, statistici si grafice.

| Componenta | Rol |
|---|---|
| `ControlPanel` | selectarea sectorului, anului, stratului si opacitatii |
| `MapPanel` | harta, LST/NDVI si limitele sectoarelor |
| `AnalyticsPanel` | statisticile principale |
| `ChartPanel` | distributii, grafice si Land Cover |
| `InsightsPanel` | interpretarea datelor din Explore |
| `ComparisonPanel` | comparatia dintre doua zone sau doi ani |

Separarea pe componente face interfata mai usor de modificat si evita concentrarea intregii logici intr-un singur fisier.

---

## Comunicarea cu backend-ul

Frontend-ul nu citeste direct fisierele GeoTIFF si nu comunica direct cu baza de date.

Datele ajung in interfata prin API-ul FastAPI.

Fluxul general este:

```text
GeoTIFF LST / NDVI + Land Cover
                |
                v
         Backend FastAPI
                |
                v
       Procesare + SQLite
                |
                v
               API
                |
                v
        Frontend React
                |
                v
       Explore / Compare
```

Backend-ul se ocupa de procesarea datelor geospatiale si de salvarea rezultatelor calculate in baza de date SQLite.

Frontend-ul cere prin API informatiile necesare pentru selectia utilizatorului, cum ar fi:

- anii disponibili;
- sectoarele;
- limitele sectoarelor;
- datele pentru harta;
- statisticile LST si NDVI;
- Land Cover;
- datele pentru grafice;
- comparatiile intre zone sau ani;
- informatiile folosite pentru interpretare.

Logica pentru request-uri este separata de componentele vizuale si se afla in:

```text
src/services/
```

`apiService.ts` comunica cu backend-ul FastAPI.

`mockApi.ts` este folosit pentru modul demo.

TanStack Query este folosit pentru request-uri, cache si starile de incarcare sau eroare.

Frontend-ul nu trebuie sa stie daca o valoare a fost citita din SQLite sau calculata dintr-un raster. Backend-ul ofera datele prin acelasi API, iar frontend-ul se ocupa de afisarea lor.

---

## Harta

Harta este realizata cu MapLibre GL.

Pe harta pot fi afisate:

- stratul LST;
- stratul NDVI;
- limitele celor sase sectoare;
- sectorul selectat;
- legenda corespunzatoare stratului;
- controlul opacitatii.

Toate limitele sectoarelor sunt pastrate pe harta pentru context.

Sectorul selectat este evidentiat printr-un contur mai vizibil, iar celelalte sectoare sunt afisate mai discret.

Aceeasi regula este folosita in Explore si pe hartile din Compare.

Stratul raster este adaugat dupa incarcarea stilului MapLibre pentru a evita eroarea:

```text
Style is not done loading
```

---

## Statistici si grafice

Frontend-ul afiseaza datele primite de la backend sub forma de indicatori si grafice.

Pentru LST pot fi afisate:

- temperatura medie;
- temperatura minima;
- temperatura maxima;
- procentul de hotspot;
- distributia temperaturilor;
- diferenta fata de media Bucurestiului.

Pentru NDVI pot fi afisate:

- NDVI mediu;
- NDVI minim;
- NDVI maxim;
- distributia valorilor;
- diferenta fata de media Bucurestiului.

Pentru datele compatibile poate fi afisata si relatia dintre LST si NDVI.

---

## Evolutia LST si NDVI

Pentru anul 2025, Explore foloseste observatiile istorice disponibile pentru a oferi context asupra valorilor actuale.

Seria folosita este:

```text
2015 -> 2018 -> 2020 -> 2023 -> 2025
```

Graficele permit observarea diferentelor dintre valorile LST si NDVI pentru anii disponibili.

Pentru sectoare, valorile pot fi raportate si la media Bucurestiului din acelasi an.

Anii anteriori sunt folositi ca repere istorice. Ei nu sunt tratati ca predictii si nici ca masuratori continue ale evolutiei orasului.

Cand este selectat un an istoric in Explore, interfata afiseaza situatia observata pentru acel an, iar comparatia cu 2025 ofera context fata de observatia cea mai recenta.

---

## Compare

Backend-ul ofera datele necesare pentru doua tipuri de comparatii.

### Comparatie intre sectoare

Comparatia spatiala se face intre doua dintre cele sase sectoare pentru acelasi an.

```text
Sector A - acelasi an
vs
Sector B - acelasi an
```

`Tot Bucurestiul` nu este disponibil ca una dintre selectiile acestei comparatii.

Valorile Bucurestiului pot fi folosite separat ca referinta pentru anumite statistici, dar nu ca zona comparata cu un sector.

### Comparatie intre ani

Comparatia temporala foloseste aceeasi zona pentru doi ani diferiti.

Zona poate fi `Tot Bucurestiul` sau unul dintre cele sase sectoare.

Exemplu pentru un sector:

```text
Sector 4 - 2020
vs
Sector 4 - 2025
```

Exemplu pentru Bucuresti:

```text
Tot Bucurestiul - 2020
vs
Tot Bucurestiul - 2025
```

Pentru fiecare comparatie sunt returnate doar valorile disponibile si compatibile.

Datele lipsa nu sunt inlocuite cu valori inventate.

---

## Land Cover in Frontend

Land Cover este integrat in frontend ca informatie suplimentara pentru interpretarea LST si NDVI.

Datele pot include categorii precum:

- suprafete construite;
- arbori;
- vegetatie joasa;
- culturi;
- apa;
- sol.

Frontend-ul se ocupa de prezentarea acestor valori prin grafice si elemente vizuale.

Calcularea procentelor Land Cover este realizata in backend.

Frontend-ul nu transforma intervalele NDVI in clase Land Cover si nu inventeaza valori atunci cand datele nu sunt disponibile.

In versiunea actuala, Land Cover este folosit ca parte a analizei si nu ca strat principal selectabil pe harta.

---

## Interpretarea datelor

Interfata poate afisa si o interpretare scurta a datelor primite de la backend.

Aceasta poate folosi informatii despre:

- LST;
- NDVI;
- hotspot-uri;
- Land Cover;
- diferenta fata de media Bucurestiului;
- observatiile istorice disponibile.

Scopul este de a explica mai simplu valorile care apar pe harta si in grafice.

Aplicatia nu afiseaza estimari care nu pot fi sustinute de date.

De exemplu, nu afirmam:

```text
Plantarea arborilor va reduce temperatura cu X grade C.
```

sau:

```text
Aceasta interventie va reduce poluarea cu X%.
```

Aplicatia este folosita pentru explorarea si compararea datelor, nu pentru estimarea exacta a efectului unei interventii viitoare.

---

## Tratarea erorilor si a datelor lipsa

Frontend-ul trateaza separat starile:

```text
loading
error
unavailable
```

Daca backend-ul nu are date pentru o anumita combinatie de zona si an, frontend-ul nu completeaza valoarea cu date inventate.

Acest lucru este important in special pentru:

- Land Cover;
- comparatiile intre ani;
- relatia LST-NDVI;
- datele istorice care nu sunt disponibile.

---

## Build si verificare

Pentru verificarea frontend-ului:

```powershell
cd frontend
npm run lint
npm run build
```

Pentru verificarea build-ului local:

```powershell
npm run preview
```

Inainte de integrarea finala verificam:

- incarcarea hartii;
- selectarea sectorului;
- selectarea anului;
- schimbarea intre LST si NDVI;
- opacitatea stratului;
- statisticile;
- graficele;
- evolutia LST si NDVI pentru 2025;
- comparatiile intre sectoare;
- comparatiile intre ani;
- Land Cover;
- starile de loading si error;
- comportamentul aplicatiei atunci cand anumite date lipsesc.
