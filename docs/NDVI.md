# NDVI - Normalized Difference Vegetation Index

## Despre NDVI

NDVI (Normalized Difference Vegetation Index) este un indice folosit pentru a identifica prezenta si intensitatea vegetatiei folosind imagini satelitare.

In proiect folosim NDVI pentru a vedea cum este distribuita vegetatia in Bucuresti si pentru a compara aceste rezultate cu temperatura suprafetei obtinuta din LST.

Intrebarea principala pentru aceasta parte este:

**Unde exista mai multa sau mai putina vegetatie si ce relatie observam intre NDVI si LST?**

---

## Date folosite

Pentru analiza NDVI avem rastere pentru anii:

- 2015
- 2018
- 2020
- 2023
- 2025

Datele provin din Landsat 8 Collection 2 Level-2.

Rasterele folosite in proiect au:

- scene din luna august;
- rezolutie spatiala de 30 m;
- CRS `EPSG:32635`;
- valoare NoData `-9999`;
- decupare dupa limita administrativa a Bucurestiului;
- aceeasi grila folosita pentru datele LST.

Folosirea aceleiasi grile este importanta pentru anii in care vrem sa comparam LST si NDVI la nivel de pixel.

---

## Calculul NDVI

NDVI este calculat folosind benzile de rosu si infrarosu apropiat din imaginile Landsat.

Formula este:

```text
NDVI = (NIR - RED) / (NIR + RED)
```

Pentru Landsat 8:

```text
NDVI = (SR_B5 - SR_B4) / (SR_B5 + SR_B4)
```

unde:

```text
SR_B5 = Near Infrared (NIR)
SR_B4 = Red
```

Pentru benzile Landsat Collection 2 Level-2 se aplica factorii de scalare ai produsului:

```text
reflectance = DN * 0.0000275 - 0.2
```

Norii si umbrele sunt eliminati folosind informatiile din banda `QA_PIXEL`.

Dupa procesare, valorile NDVI valide sunt pastrate in intervalul:

```text
-1 ... 1
```

---

## Statistici calculate

Pentru Bucuresti si pentru fiecare sector calculam:

- NDVI mediu;
- NDVI minim;
- NDVI maxim;
- distributia valorilor NDVI;
- procentul pixelilor cu NDVI peste `0.4`;
- diferenta fata de media Bucurestiului pentru acelasi an.

Pentru distributie folosim intervalele:

```text
NDVI < 0.2
0.2 - 0.4
0.4 - 0.6
NDVI > 0.6
```

Aceste intervale ne ajuta sa vedem distributia valorilor NDVI, dar nu sunt folosite pentru a clasifica direct tipurile de teren.

De exemplu, o valoare NDVI mica nu inseamna automat ca pixelul reprezinta o cladire sau un drum.

Pentru identificarea claselor precum zone construite, vegetatie sau apa folosim separat datele Land Cover.

---

## Comparatia cu Bucurestiul

Pentru fiecare sector calculam si diferenta dintre NDVI-ul mediu al sectorului si NDVI-ul mediu al Bucurestiului pentru acelasi an.

```text
delta = NDVI mediu sector - NDVI mediu Bucuresti
```

O valoare pozitiva arata ca sectorul are un NDVI mediu mai mare decat media orasului pentru observatia respectiva.

O valoare negativa arata ca NDVI-ul mediu este sub media Bucurestiului.

Astfel putem compara sectoarele folosind aceeasi referinta pentru anul selectat.

---

## Relatia dintre NDVI si LST

Una dintre analizele proiectului este compararea NDVI cu LST.

Pentru aceasta analiza, backend-ul verifica mai intai daca rasterele LST si NDVI sunt compatibile:

- acelasi CRS;
- aceeasi rezolutie;
- aceeasi grila;
- aceeasi zona analizata.

Sunt folositi doar pixelii care au valori valide in ambele rastere.

Nu completam pixelii lipsa cu valori artificiale.

Pentru datele compatibile putem calcula:

- corelatia Spearman;
- corelatia Pearson;
- media LST pentru zone cu valori NDVI diferite;
- un esantion de puncte pentru reprezentarea grafica.

Corelatia Spearman este folosita pentru a observa daca exista o relatie generala intre cele doua variabile, iar Pearson ne ajuta sa verificam relatia liniara.

De exemplu, o corelatie negativa inseamna ca pixelii cu NDVI mai mare tind sa aiba valori LST mai mici in observatia analizata.

Aceasta este o asociere intre cele doua seturi de date si nu demonstreaza ca vegetatia este singura cauza a temperaturilor observate.

---

## De ce folosim NDVI impreuna cu LST

LST ne arata unde suprafata este mai calda, iar NDVI ne ofera informatii despre vegetatie.

Analizate impreuna, cele doua straturi ne ajuta sa intelegem mai bine diferentele dintre zone.

De exemplu:

- LST ridicat si NDVI redus pot indica o zona in care merita analizata mai atent prezenta vegetatiei si a suprafetelor construite;
- LST redus si NDVI ridicat pot indica zone in care vegetatia contribuie la caracteristicile locale observate;
- rezultate diferite sau neclare trebuie verificate folosind harta si celelalte date disponibile.

Aplicatia nu genereaza automat concluzii despre o parcela doar pe baza acestor doua valori.

---

## Ce afiseaza aplicatia

Datele NDVI sunt folosite in frontend pentru:

- harta NDVI;
- legenda valorilor;
- statistici pentru Bucuresti si sectoare;
- distributia valorilor NDVI;
- comparatii intre sectoare;
- comparatii intre ani;
- diferenta fata de media Bucurestiului;
- analiza relatiei dintre NDVI si LST.

---

## Limite

NDVI trebuie interpretat impreuna cu celelalte date ale proiectului.

Cateva limite importante sunt:

- NDVI nu este o clasificare Land Cover;
- valori mici sau negative pot aparea pentru apa, sol, suprafete construite sau alte zone fara vegetatie;
- scenele folosite reprezinta observatii din anumite zile din luna august, nu media intregii veri;
- norii si umbrele pot influenta datele daca nu sunt mascate corect;
- diferentele dintre ani pot fi influentate si de conditiile din momentul achizitiei imaginii;
- corelatia dintre NDVI si LST nu demonstreaza o relatie de cauzalitate;
- analiza nu poate estima direct cu cate grade ar scadea temperatura daca ar fi construit un parc sau un acoperis verde.

Din acest motiv, folosim NDVI ca indicator pentru analiza vegetatiei si pentru comparatii spatiale, impreuna cu LST si Land Cover.
