# Frontend

## Despre Frontend

Frontend-ul este partea interactiva a aplicatiei Urban Heat Island Bucharest.

Aici sunt afisate hartile LST si NDVI, statisticile pentru Bucuresti si sectoare, graficele, datele Land Cover si comparatiile dintre zone sau ani.

Interfata este construita cu React si TypeScript si comunica cu backend-ul FastAPI pentru obtinerea datelor.

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

Este modul principal de explorare a datelor.

Utilizatorul poate selecta:

- Bucuresti sau unul dintre cele sase sectoare;
- anul;
- stratul LST sau NDVI;
- opacitatea stratului de pe harta.

Pe langa harta, sunt afisate statisticile si graficele disponibile pentru selectia curenta.

### Compare

Este modul folosit pentru comparatii.

Utilizatorul poate compara:

- doua sectoare pentru acelasi an;
- acelasi sector pentru doi ani diferiti.

Astfel, Explore este folosit pentru analiza unei selectii, iar Compare pentru a vedea diferentele dintre doua selectii.

---

## Anul 2025 si reperele istorice

In aplicatie, anul 2025 este folosit ca observatia cea mai recenta.

Pentru 2025, sectiunea Explore poate afisa si evolutia LST si NDVI folosind observatiile istorice disponibile:

```text
2015 -> 2018 -> 2020 -> 2023 -> 2025
```

Pentru un sector, graficele de evolutie urmaresc valorile LST si NDVI si diferenta lor fata de media Bucurestiului.

Pentru selectia `Tot Bucurestiul`, sunt afisate valorile medii ale orasului pentru anii disponibili.

Anii:

```text
2015
2018
2020
2023
```

sunt tratati in principal ca repere istorice.

Cand este selectat un an istoric in Explore, interfata se concentreaza pe datele acelui an si permite folosirea lui ca punct de comparatie cu situatia din 2025.

In acest fel, seria istorica ofera context pentru datele recente, fara sa fie prezentata ca prognoza.

---

## Pornirea frontend-ului

Backend-ul trebuie sa ruleze pe:

```text
http://127.0.0.1:8000
```

Pentru pornirea frontend-ului:

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

Aplicatia ruleaza de obicei pe:

```text
http://localhost:5173
```

---

## Modul demo

Frontend-ul poate fi pornit si fara backend folosind date demonstrative.

Pentru acest mod se poate elimina fisierul `.env` sau se poate seta:

```env
VITE_DATA_MODE=demo
```

Datele folosite in acest mod trebuie tratate ca date demonstrative si nu ca rezultate reale ale analizei.

Modul demo a fost pastrat pentru dezvoltarea si testarea interfetei atunci cand backend-ul sau fisierele raster nu sunt disponibile.

---

## Tehnologii folosite

| Tehnologie | Rol in proiect |
|---|---|
| React + TypeScript | componentele si logica interfetei |
| Vite | rularea si build-ul aplicatiei |
| Tailwind CSS | stilizare si layout responsive |
| MapLibre GL | harta si overlay-urile georeferentiate |
| Recharts | grafice si comparatii |
| TanStack Query | request-uri catre API, cache si tratarea starilor de incarcare |

---

## Componente principale

Frontend-ul este impartit in mai multe componente pentru a separa harta, controalele si partea de analiza.

| Componenta | Rol |
|---|---|
| `ControlPanel` | selectarea sectorului, anului, stratului si opacitatii |
| `MapPanel` | harta, LST/NDVI si limitele sectoarelor |
| `AnalyticsPanel` | statisticile principale |
| `ChartPanel` | grafice, distributii si Land Cover |
| `InsightsPanel` | interpretarea datelor din Explore |
| `ComparisonPanel` | comparatia dintre doua zone sau doi ani |

Aceasta impartire ne-a ajutat sa nu punem toata logica aplicatiei intr-o singura componenta.

---

## Comunicarea cu backend-ul

Logica pentru obtinerea datelor este separata de componentele vizuale.

Fisierele din:

```text
src/services/
```

se ocupa de sursa datelor.

`apiService.ts` comunica cu backend-ul FastAPI.

`mockApi.ts` este folosit pentru modul demo.

Fluxul general este:

```text
Utilizator
    ->
Componente React
    ->
Data Service
    ->
FastAPI Backend
    ->
Date si statistici
```

Aceasta structura permite folosirea aceleiasi interfete atat cu datele reale din API, cat si cu datele demonstrative in timpul dezvoltarii.

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

Toate limitele sectoarelor raman vizibile pentru context.

Sectorul selectat este evidentiat mai clar, iar celelalte limite sunt afisate mai discret.

Aceeasi idee este folosita atat in Explore, cat si pe hartile din Compare.

Stratul raster este adaugat dupa ce stilul hartii a fost incarcat. Acest lucru evita eroarea MapLibre:

```text
Style is not done loading
```

---

## Grafice si statistici

Frontend-ul afiseaza statisticile primite de la backend sub forma de carduri si grafice.

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

Pentru datele compatibile poate fi afisata si analiza comuna LST-NDVI.

---

## Evolutia LST si NDVI

Pentru selectia 2025 din Explore, frontend-ul foloseste anii disponibili pentru a oferi context istoric.

Seria poate include:

```text
2015
2018
2020
2023
2025
```

Graficele permit observarea modului in care valorile LST si NDVI difera intre observatiile disponibile.

Aceste puncte nu reprezinta o serie continua de masuratori si nu sunt folosite pentru prognoza.

Fiecare an reprezinta o observatie separata obtinuta din datele disponibile pentru proiect.

Din acest motiv, in interfata folosim termenul de evolutie sau context istoric, dar nu prezentam seria ca predictie a temperaturii sau vegetatiei.

---

## Compare

Modul Compare permite analiza a doua selectii in paralel.

### Comparatie intre sectoare

Pot fi selectate doua sectoare pentru acelasi an.

Aplicatia afiseaza hartile si indicatorii pentru ambele zone, ceea ce permite observarea diferentelor dintre ele.

### Comparatie intre ani

Poate fi selectat acelasi sector pentru doi ani diferiti.

De exemplu:

```text
Sector 3 - 2018
vs
Sector 3 - 2025
```

Aceasta comparatie este utila pentru folosirea anilor anteriori ca repere fata de observatia recenta din 2025.

Compare nu transforma diferentele observate intr-o relatie de cauza-efect. Aplicatia prezinta valorile disponibile si diferentele dintre ele.

---

## Land Cover in Frontend

Land Cover este integrat in frontend ca informatie suplimentara pentru interpretarea LST si NDVI.

Datele pot include categorii precum:

- zone construite;
- arbori;
- vegetatie joasa;
- culturi;
- apa;
- sol.

Frontend-ul se ocupa de modul in care aceste valori sunt prezentate si comparate.

Procesarea si calcularea procentelor sunt realizate in backend.

Land Cover nu este obtinut din intervalele NDVI si nu este afisat ca valoare reala atunci cand datele nu sunt disponibile.

In versiunea actuala, Land Cover este folosit ca parte a analizei si nu ca strat principal selectabil pe harta.

---

## Interpretarea datelor

Pe langa valorile numerice, interfata poate afisa o interpretare scurta a datelor primite.

Aceasta poate combina informatii despre:

- LST;
- NDVI;
- hotspot-uri;
- Land Cover;
- diferenta fata de Bucuresti;
- evolutia observatiilor disponibile.

Interpretarea este folosita pentru a explica mai simplu ceea ce se vede in grafice si pe harta.

Nu sunt afisate estimari care nu pot fi sustinute de date, de exemplu:

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

Daca backend-ul nu are date pentru o anumita combinatie de zona si an, frontend-ul nu trebuie sa inventeze o valoare.

Datele lipsa sunt afisate ca indisponibile.

Aceasta regula este importanta mai ales pentru comparatiile intre ani si pentru Land Cover.

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

Inainte de integrarea finala cu backend-ul trebuie verificate:

- incarcarea hartii;
- schimbarea sectorului;
- schimbarea anului;
- schimbarea LST/NDVI;
- graficele;
- evolutia pentru 2025;
- comparatiile intre sectoare;
- comparatiile intre ani;
- Land Cover;
- starile de loading si error;
- comportamentul aplicatiei cand anumite date lipsesc.
