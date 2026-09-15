# Urban Heat Island Bucharest

Aplicatie web pentru explorarea insulei de caldura urbana din Bucuresti.

Proiectul combina date despre temperatura suprafetei (LST), vegetatie (NDVI), Land Cover si limitele celor sase sectoare intr-un dashboard interactiv.

Ideea proiectului este sa putem vedea mai usor unde apar zonele mai calde, cum se raporteaza acestea la vegetatie si ce semnale din date ar merita verificate inainte de dezvoltarea unui amplasament urban.

## Intrebarile proiectului

Aplicatia porneste de la trei intrebari principale:

1. **Unde apar suprafetele mai calde in Bucuresti?**
2. **Cum se asociaza vegetatia cu temperatura suprafetei?**
3. **Ce semnale din date merita verificate de un dezvoltator inainte de proiectare?**

Aplicatia este un instrument de screening si explorare. Nu inlocuieste analiza unui teren la nivel de parcela, studiile tehnice, analiza de mediu sau verificarea din teren.

---

## Componentele proiectului

Proiectul este impartit in patru componente principale:

| Componenta | Rol |
|---|---|
| **LST** | Analiza temperaturii suprafetei |
| **NDVI** | Analiza distributiei vegetatiei |
| **Backend** | Prelucrarea datelor si furnizarea statisticilor prin API |
| **Frontend** | Interfata web, harta si vizualizarea rezultatelor |

**Land Cover** este folosit ca informatie de context si este integrat in partea de frontend. Statisticile aferente sunt pregatite si furnizate de backend.

Pentru mai multe detalii despre fiecare componenta, vezi documentatia din folderul `docs/`.

---

## Pornirea aplicatiei

### Backend

In Windows:

```powershell
.\backend\start-backend.cmd
```

Backend-ul porneste implicit la:

```text
http://127.0.0.1:8000
```

Documentatia API poate fi accesata la:

```text
http://127.0.0.1:8000/docs
```

Daca este nevoie de pornire manuala:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Frontend-ul este disponibil de obicei la:

```text
http://localhost:5173
```

---

## Datele folosite

### LST

LST (Land Surface Temperature) reprezinta temperatura suprafetei terestre. In aplicatie este folosita pentru identificarea zonelor cu temperaturi mai ridicate si pentru compararea valorilor intre observatiile disponibile.

Datele disponibile sunt pentru anii:

- 2015
- 2018
- 2020
- 2023
- 2025

### NDVI

NDVI (Normalized Difference Vegetation Index) este folosit pentru observarea semnalului asociat vegetatiei.

LST si NDVI pot fi analizate impreuna la nivelul pixelilor aliniati pentru a vedea daca exista o asociere intre vegetatie si temperatura suprafetei.

Datele NDVI sunt disponibile pentru aceiasi ani:

- 2015
- 2018
- 2020
- 2023
- 2025

### Land Cover

Land Cover ofera context despre tipurile de suprafete din oras, de exemplu zone construite, vegetatie, apa sau alte clase de acoperire a terenului.

Procentele sunt calculate la nivel de oras sau sector si nu trebuie interpretate ca o clasificare exacta a unei parcele.

Pentru selectiile din aplicatie sunt folosite date Land Cover pentru 2018, 2020, 2023 si 2025. Pentru selectia 2015 este folosita cea mai apropiata clasificare disponibila, din 2017.

Anul real al sursei este pastrat separat, astfel incat clasificarea din 2017 sa nu fie prezentata ca fiind realizata in 2015.

### Sectoare

Limitele celor sase sectoare din Bucuresti sunt folosite pentru agregarea si compararea rezultatelor intre zone.

---

## Ce putem vedea in aplicatie

Dashboard-ul permite:

- vizualizarea hartilor LST si NDVI;
- afisarea limitelor celor sase sectoare;
- selectarea anilor disponibili;
- afisarea unor statistici precum medie, minim si maxim;
- vizualizarea distributiilor valorilor;
- vizualizarea statisticilor Land Cover;
- analiza relatiei dintre LST si NDVI;
- vizualizarea observatiilor istorice pentru LST si NDVI;
- compararea a doua dintre cele sase sectoare pentru acelasi an;
- compararea aceleiasi zone intre doi ani diferiti;
- raportarea anumitor indicatori ai unui sector la media Bucurestiului;
- generarea unui raport scurt cu semnale si actiuni care merita verificate.

Pentru identificarea hotspot-urilor folosim percentila 90 a valorilor LST din Bucuresti pentru anul analizat. Astfel, pragul este calculat in functie de distributia datelor din acel an.

---

## Cum interpretam rezultatele

Am incercat sa pastram interpretarea rezultatelor cat mai apropiata de ceea ce permit efectiv datele.

- **LST este temperatura suprafetei**, nu temperatura aerului.
- O asociere intre NDVI si LST nu demonstreaza automat o relatie de cauzalitate.
- Procentele de Land Cover sunt statistici la nivel de oras sau sector, nu la nivel de parcela.
- Zonele construite pot include mai multe tipuri de suprafete, inclusiv drumuri.
- Rezultatele istorice sunt folosite pentru comparatie si observarea unor diferente, nu ca predictie numerica a viitorului.
- Recomandarile din aplicatie reprezinta semnale care trebuie verificate prin date suplimentare si, unde este cazul, prin observatii din teren.

Aplicatia nu estimeaza direct reducerea poluarii si nu afirma ca o anumita interventie va produce un numar exact de grade de racire.

---

## Comparatii intre ani si sectoare

Aplicatia permite doua tipuri principale de comparatii.

### Comparatie intre sectoare

Pot fi comparate doua dintre cele sase sectoare pentru acelasi an.

De exemplu:

```text
Sector 2 - 2025
vs
Sector 6 - 2025
```

`Tot Bucurestiul` nu poate fi selectat ca una dintre cele doua zone in acest tip de comparatie.

Media Bucurestiului poate fi folosita separat ca reper pentru anumiti indicatori ai sectorului selectat, dar nu reprezinta o selectie in comparatia dintre sectoare.

### Comparatie intre ani

Poate fi comparata aceeasi zona pentru doi ani diferiti.

Zona poate fi unul dintre cele sase sectoare sau `Tot Bucurestiul`.

De exemplu, pentru un sector:

```text
Sector 3 - 2018
vs
Sector 3 - 2025
```

sau pentru intregul oras:

```text
Tot Bucurestiul - 2018
vs
Tot Bucurestiul - 2025
```

Pot fi comparati doi ani disponibili pentru aceeasi zona.

Anii istorici sunt folositi ca repere pentru observarea diferentelor dintre momentele disponibile. Comparatiile nu reprezinta o predictie asupra evolutiei viitoare.

---

## Arhitectura aplicatiei

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

Backend-ul foloseste:

- **FastAPI** pentru API;
- **Rasterio** si **NumPy** pentru lucrul cu datele raster;
- **SciPy** pentru anumite calcule statistice;
- **SQLite / SQLAlchemy** pentru persistarea unor rezultate calculate.

Frontend-ul este construit cu:

- **React**;
- **TypeScript**;
- **Vite**;
- **MapLibre**;
- **Recharts**;
- **TanStack Query**.

Frontend-ul nu acceseaza direct fisierele raster sau baza de date. Datele sunt procesate de backend si sunt trimise interfetei prin API.

---

## Frontend

Frontend-ul este partea cu care interactioneaza utilizatorul.

Principalele componente sunt:

- `ControlPanel` - filtre si controale;
- `MapPanel` - harta si straturile geospatiale;
- componentele de analiza si grafice;
- partea de comparatii;
- raportul si zona de insights.

`App.tsx` coordoneaza interfata, starea si navigarea dintre principalele zone ale aplicatiei.

Datele sunt gestionate prin hooks, TanStack Query si serviciile pentru comunicarea cu backend-ul.

Aplicatia poate lucra atat cu API-ul real, cat si cu date demonstrative, in functie de configurare.

---

## De ce combinam LST, NDVI si Land Cover?

Fiecare set de date ne spune ceva diferit:

- **LST** -> cat de calda este suprafata;
- **NDVI** -> unde exista semnal de vegetatie;
- **Land Cover** -> ce tipuri de suprafete contribuie la contextul zonei;
- **Sectoarele** -> permit agregarea si compararea rezultatelor.

LST si NDVI sunt analizate impreuna pentru a observa posibile asocieri intre temperatura suprafetei si vegetatie.

Land Cover este folosit separat ca informatie de context despre tipurile de suprafete din zona analizata.

---

## Functionalitati principale

Aplicatia ofera doua moduri principale de explorare a datelor.

### Explore

Explore permite vizualizarea spatiala a datelor pentru o anumita zona si un anumit an.

Utilizatorul poate explora:

- harta LST;
- harta NDVI;
- statisticile zonei;
- distributiile valorilor;
- Land Cover;
- relatia dintre LST si NDVI;
- contextul oferit de observatiile istorice disponibile.

Pentru 2025, observatiile din 2015, 2018, 2020 si 2023 pot fi folosite pentru a oferi context asupra valorilor recente.

### Compare

Compare permite doua tipuri de comparatii:

- doua dintre cele sase sectoare pentru acelasi an;
- aceeasi zona intre doi ani diferiti.

Pentru comparatia intre ani, zona poate fi un sector sau `Tot Bucurestiul`.

Pentru comparatia intre sectoare sunt disponibile doar cele sase sectoare. `Tot Bucurestiul` nu poate fi folosit ca una dintre cele doua selectii.

### Analiza

Sunt disponibile statistici precum:

- medie;
- minim;
- maxim;
- distributii;
- ponderea hotspot-urilor;
- statistici Land Cover;
- corelatii LST-NDVI;
- observatii istorice LST si NDVI.

Pentru relatia dintre LST si NDVI pot fi folosite corelatiile Pearson si Spearman atunci cand datele sunt compatibile.

### Raport

Aplicatia poate genera un raport scurt care sintetizeaza principalele semnale observate si cateva actiuni care merita verificate in continuare.

---

## Directii viitoare

Proiectul poate fi extins prin adaugarea unor surse suplimentare de date:

- **Calitatea aerului** - indicatori de poluare;
- **Microclimat urban** - temperatura si umiditate la nivel local;
- **Senzori IoT** - date in timp real despre temperatura, umiditate, zgomot si poluare;
- **Simularea interventiilor** - arbori, acoperisuri verzi si suprafete permeabile.

Scopul ar fi sa trecem de la simpla vizualizare a unor indicatori catre o analiza mai complexa a unui amplasament urban.

---

## Posibila directie de dezvoltare

O directie de dezvoltare a proiectului este transformarea aplicatiei intr-un instrument B2B pentru screening-ul initial al unor amplasamente.

Un astfel de produs ar putea oferi:

- rapoarte pentru parcele;
- comparatii intre zone similare;
- monitorizare pe mai multi ani;
- export PDF;
- scenarii pentru diferite interventii;
- acces prin API;
- analiza pentru un portofoliu de amplasamente.

Ideea nu este sa inlocuiasca studiile tehnice, ci sa ofere o prima imagine asupra unor riscuri si oportunitati care merita investigate inainte de o investitie.

---

## Echipa

| Membru | Responsabilitate |
|---|---|
| **Mihai Radulescu** | LST |
| **Cristian Pleseanu** | NDVI |
| **Daria-Alexandra Demian** | Backend |
| **Iuliana-Alexandra Florea** | Frontend si integrarea Land Cover |

---

## Documentatie

Pentru detalii suplimentare despre implementare si date, vezi documentatia separata pentru:

- LST;
- NDVI;
- Backend;
- Frontend.

---

## Limitari

Pentru interpretarea corecta a rezultatelor trebuie tinut cont de cateva limitari:

1. LST reprezinta temperatura suprafetei, nu temperatura aerului.
2. Datele satelitare ofera o imagine spatiala si temporala limitata a fenomenului.
3. Corelatia dintre LST si NDVI nu implica automat cauzalitate.
4. Statisticile Land Cover sunt agregate la nivel de oras sau sector.
5. Observatiile din ani diferiti nu reprezinta o serie continua de masuratori.
6. Rezultatele trebuie validate cu informatii suplimentare atunci cand sunt folosite pentru decizii concrete asupra unui amplasament.
7. Aplicatia este gandita pentru screening si explorare, nu pentru a inlocui studiile tehnice sau de mediu.

---

## Pe scurt

Am construit un dashboard geospatial pentru explorarea insulei de caldura urbana din Bucuresti, folosind LST, NDVI, Land Cover si limitele administrative ale sectoarelor.

Aplicatia permite explorarea datelor spatial si temporal, compararea sectoarelor si a anilor disponibili si observarea relatiei dintre temperatura suprafetei, vegetatie si tipurile de suprafete urbane.
