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

Pentru mai multe detalii, vezi documentatia din folderul `docs/`.

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

LST (Land Surface Temperature) reprezinta temperatura suprafetei terestre. In aplicatie este folosita pentru identificarea si compararea zonelor cu temperaturi mai ridicate.

Datele disponibile sunt pentru anii:

- 2015
- 2018
- 2020
- 2023
- 2025

### NDVI

NDVI (Normalized Difference Vegetation Index) este folosit pentru a observa semnalul asociat vegetatiei.

LST si NDVI sunt analizate impreuna la nivelul pixelilor aliniati pentru a vedea daca exista o asociere intre vegetatie si temperatura suprafetei.

### Land Cover

Land Cover ofera context despre tipurile de suprafete din oras, de exemplu zone construite, vegetatie sau alte clase de acoperire a terenului.

Procentele sunt calculate la nivel de oras sau sector si nu trebuie interpretate ca o clasificare exacta a unei parcele.

### Sectoare

Limitele celor sase sectoare din Bucuresti sunt folosite pentru agregarea si compararea rezultatelor intre zone.

---

## Ce putem vedea in aplicatie

Dashboard-ul permite:

- vizualizarea hartilor LST si NDVI;
- afisarea limitelor sectoarelor;
- compararea anilor disponibili;
- afisarea unor statistici precum medie, minim si maxim;
- vizualizarea distributiilor valorilor;
- vizualizarea statisticilor Land Cover;
- analiza relatiei dintre LST si NDVI;
- evolutia in timp pentru LST si NDVI;
- comparatii intre sectoare;
- comparatii intre un sector si media Bucurestiului;
- generarea unui raport scurt cu semnale si actiuni care merita verificate.

Pentru identificarea hotspot-urilor folosim percentila 90 a valorilor LST din Bucuresti pentru anul analizat. Astfel, pragul este calculat in functie de distributia datelor din acel an.

---

## Cum interpretam rezultatele

Am incercat sa pastram interpretarea rezultatelor cat mai apropiata de ceea ce permit efectiv datele.

- **LST este temperatura suprafetei**, nu temperatura aerului.
- O asociere intre NDVI si LST nu demonstreaza automat o relatie de cauzalitate.
- Procentele de Land Cover sunt statistici la nivel de oras sau sector, nu la nivel de parcela.
- Zonele construite pot include mai multe tipuri de suprafete, inclusiv drumuri.
- Rezultatele istorice sunt folosite pentru comparatie si observarea unor tipare, nu ca predictie numerica a viitorului.
- Recomandarile din aplicatie reprezinta semnale care trebuie verificate prin date suplimentare si, unde este cazul, prin observatii din teren.

Aplicatia nu estimeaza direct reducerea poluarii si nu afirma ca o anumita interventie va produce un numar exact de grade de racire.

---

## Comparatii intre ani si sectoare

Pentru comparatiile intre sectoare folosim si diferenta fata de media Bucurestiului pentru acelasi an.

Acest lucru ne ajuta sa evitam situatia in care interpretam o valoare absoluta fara sa tinem cont de conditiile generale ale anului respectiv.

Datele disponibile sunt:

- **LST:** 2015, 2018, 2020, 2023, 2025
- **NDVI:** 2015, 2018, 2020, 2023, 2025
- **Land Cover:** 2015, 2018, 2020, 2023, 2025
- **Limitele sectoarelor:** GeoJSON in WGS84

Pentru NDVI, metadatele disponibile trebuie luate in considerare la interpretare, deoarece datele provin din scene individuale si nu reprezinta neaparat o medie pentru perioada iunie-august.

---

## Arhitectura aplicatiei

```text
GeoTIFF LST / NDVI       GeoTIFF Land Cover       GeoJSON sectoare
         |                       |                       |
         +-----------------------+-----------------------+
                                 |
                    Python + Rasterio + NumPy
                                 |
                  FastAPI: statistici, comparatii,
                         raport si API
                                 |
                       React + TypeScript
                              MapLibre
                                 |
                    Explore / Compare / Rapoarte
```

Backend-ul foloseste:

- **FastAPI** pentru API;
- **Rasterio** si **NumPy** pentru lucrul cu datele raster;
- **SQLite / SQLAlchemy** pentru persistarea unor rezultate calculate.

Frontend-ul este construit cu:

- **React**
- **TypeScript**
- **Vite**
- **MapLibre**
- **Recharts**
- **TanStack Query**

---

## Frontend

Frontend-ul este partea cu care interactioneaza utilizatorul.

Principalele componente sunt:

- `ControlPanel` – filtre si controale;
- `MapPanel` – harta si straturile geospatiale;
- componentele de analiza si grafice;
- partea de comparatii;
- raportul si zona de insights.

`App.tsx` coordoneaza interfata, starea si navigarea dintre principalele zone ale aplicatiei.

Datele sunt gestionate prin hooks, TanStack Query si `dataService`.

Aplicatia poate lucra atat cu API-ul real, cat si cu date demonstrative, in functie de configurare.

---

## De ce combinam LST, NDVI si Land Cover?

Fiecare set de date ne spune ceva diferit:

- **LST** → cat de calda este suprafata;
- **NDVI** → unde exista semnal de vegetatie;
- **Land Cover** → ce tipuri de suprafete contribuie la contextul zonei;
- **Sectoarele** → ne permit sa agregam si sa comparam rezultatele.

LST si NDVI sunt analizate impreuna pentru a observa posibile asocieri intre temperatura si vegetatie, in timp ce Land Cover este folosit in principal pentru a intelege contextul suprafetelor analizate.

---

## Functionalitati principale

Aplicatia ofera mai multe moduri de explorare a datelor:

### Explore

Permite vizualizarea spatiala a datelor si explorarea diferitelor straturi pentru un anumit an.

### Compare

Permite compararea:

- anilor;
- sectoarelor;


### Analiza

Sunt disponibile statistici precum:

- medie;
- minim;
- maxim;
- distributii;
- ponderea hotspot-urilor;
- statistici Land Cover;
- corelatii LST–NDVI.
- evolutie in timp LST / NDVI;

Pentru relatia dintre LST si NDVI pot fi folosite atat corelatia Pearson, cat si Spearman.

### Raport

Aplicatia poate genera un raport scurt care sintetizeaza principalele semnale observate si cateva actiuni care merita verificate in continuare.

---

## Directii viitoare

Proiectul poate fi extins prin adaugarea unor surse suplimentare de date:

- **Calitatea aerului** – indicatori de poluare;
- **Microclimat urban** – temperatura si umiditate la nivel local;
- **Senzori IoT** – date in timp real despre temperatura, umiditate, zgomot si poluare;
- **Simularea interventiilor** – arbori, acoperisuri verzi si suprafete permeabile.

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
| **Mihai Rădulescu** | LST |
| **Cristian Pleșeanu** | NDVI |
| **Daria-Alexandra Demian** | Backend |
| **Iuliana-Alexandra Florea** | Frontend si integrarea Land Cover |

---



## Documentatie

Pentru detalii suplimentare despre date si integrarea componentelor, vezi documentele din folderul `docs/` si:

- `ASSESSMENT_DATA_CONTRACT.md`

---

## Limitari

Pentru interpretarea corecta a rezultatelor trebuie tinut cont de cateva limitari:

1. LST reprezinta temperatura suprafetei, nu temperatura aerului.
2. Datele satelitare ofera o imagine spatiala si temporala limitata a fenomenului.
3. Corelatia dintre LST si NDVI nu implica automat cauzalitate.
4. Statisticile Land Cover sunt agregate la nivel de oras sau sector.
5. Rezultatele trebuie validate cu informatii suplimentare atunci cand sunt folosite pentru decizii concrete asupra unui amplasament.
6. Aplicatia este gandita pentru screening si explorare, nu pentru a inlocui studiile tehnice sau de mediu.

---

## Pe scurt

Am construit un dashboard geospatial pentru explorarea insulei de caldura urbana din Bucuresti, folosind LST, NDVI, Land Cover si limitele administrative ale sectoarelor.

Aplicatia ne permite sa exploram datele spatial si temporal, sa comparam zone si ani si sa identificam semnale care pot fi investigate mai departe in contextul dezvoltarii urbane.
