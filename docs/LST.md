# LST - Land Surface Temperature

## Despre LST

LST (Land Surface Temperature) reprezinta temperatura suprafetei observate de satelit. In cazul Bucurestiului, folosim aceste date pentru a vedea ce zone ale orasului au temperaturi mai ridicate la nivelul suprafetei si cum difera valorile intre sectoare si intre anii analizati.

LST nu reprezinta temperatura aerului. Valorile sunt influentate de tipul suprafetei observate, de exemplu cladiri, drumuri, vegetatie sau alte tipuri de teren.

In proiect folosim LST pentru a raspunde in principal la intrebarea:

**Unde apar cele mai ridicate temperaturi ale suprafetei in Bucuresti si cum difera acestea intre sectoare si ani?**

---

## Date folosite

Pentru analiza LST, proiectul foloseste rastere GeoTIFF pentru anii:

- 2015
- 2018
- 2020
- 2023
- 2025

Backend-ul cauta fisierele:

```text
lst_2015.tif
lst_2018.tif
lst_2020.tif
lst_2023.tif
lst_2025.tif
```

Fisierele raster sunt pastrate local in:

```text
backend/data/
```

Acestea nu sunt urcate pe GitHub deoarece au dimensiuni mari.

Pentru procesarea datelor au fost folosite produse Landsat Collection 2 Level-2 si banda termica `ST_B10`. In procesul de lucru au fost folosite si proiecte QGIS pentru verificarea si vizualizarea rezultatelor.

---

## Procesarea datelor

Fluxul general pentru LST este:

```text
Landsat Collection 2 Level-2 / ST_B10
        -> verificare CRS si NoData
        -> conversie la Celsius
        -> decupare pentru Bucuresti
        -> calcul statistici
        -> calcul hotspot
        -> generare strat pentru harta
```

Pentru rasterele `ST_B10` care contin valori scalate, conversia in Celsius se face cu formula:

```text
LST [C] = valoare * 0.00341802 + 149.0 - 273.15
```

Daca rasterul contine deja valori in Celsius, acestea nu mai sunt convertite.

Pentru calcule sunt folositi doar pixelii valizi. Valorile NoData si valorile din afara intervalului de control `-80 ... 100 C` sunt ignorate.

---

## Statistici calculate

Pentru fiecare zona analizata calculam:

- temperatura medie;
- temperatura minima;
- temperatura maxima;
- distributia valorilor LST;
- procentul de suprafata considerata hotspot;
- diferenta fata de media Bucurestiului pentru acelasi an.

Statisticile pot fi calculate pentru Bucuresti sau separat pentru fiecare sector.

---

## Hotspot-uri

Pentru hotspot-uri folosim percentila 90 a valorilor LST valide din Bucuresti pentru anul selectat.

Pe scurt:

```text
hotspot = pixel LST > percentila 90 pentru Bucuresti
```

Pragul este calculat separat pentru fiecare an.

Am ales aceasta metoda deoarece un prag fix, de exemplu `35 C`, nu ar functiona la fel de bine pentru toate imaginile. Intr-un an sau intr-o zi foarte calda, o mare parte din oras ar putea depasi acelasi prag.

Cu percentila 90 putem evidentia aproximativ cele mai calde 10% dintre suprafetele analizate pentru observatia respectiva.

Pentru fiecare sector putem calcula apoi ce procent din suprafata sa intra in aceasta categorie.

---

## Comparatia cu Bucurestiul

Pe langa valoarea LST a unui sector, calculam si diferenta fata de media Bucurestiului din acelasi an.

```text
delta = LST mediu sector - LST mediu Bucuresti
```

De exemplu, o valoare pozitiva inseamna ca sectorul are un LST mediu mai mare decat media orasului pentru observatia respectiva.

Aceasta comparatie este utila deoarece temperaturile pot fi diferite de la un an la altul. Astfel, nu ne uitam doar la valoarea absoluta, ci si la pozitia sectorului fata de restul orasului.

---

## Ce afiseaza aplicatia

Datele LST sunt folosite in frontend pentru:

- harta temperaturii suprafetei;
- legenda in grade Celsius;
- contururile sectoarelor;
- temperatura medie, minima si maxima;
- procentul de hotspot;
- distributia valorilor;
- comparatii intre sectoare;
- comparatii intre ani;
- analiza relatiei dintre LST si NDVI.

---

## LST si NDVI

LST este analizat si impreuna cu NDVI.

Scopul este sa vedem daca zonele cu mai multa vegetatie tind sa aiba temperaturi mai mici ale suprafetei.

Pentru anii in care rasterele LST si NDVI sunt compatibile, valorile pot fi comparate la nivel de pixel si poate fi calculata o corelatie.

Aceasta analiza arata o asociere statistica. Nu inseamna automat ca vegetatia este singura cauza a temperaturilor observate.

---

## Limite

Datele LST trebuie interpretate tinand cont de cateva limite:

- LST reprezinta temperatura suprafetei, nu temperatura aerului;
- o imagine satelitara descrie conditiile din momentul trecerii satelitului;
- norii, umbrele si ora observatiei pot influenta rezultatele;
- diferentele dintre ani nu pot fi puse automat pe seama dezvoltarii urbane;
- analiza la nivel de sector nu descrie exact situatia unei parcele individuale.

Din acest motiv, folosim rezultatele ca instrument de analiza si comparatie la nivel urban, nu ca masuratori directe ale confortului termic resimtit de oameni.
