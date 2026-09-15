# LST - Land Surface Temperature

## Rolul in proiect

LST arata temperatura radiativa a suprafetei observate de satelit. In mediul urban, ea ajuta la localizarea acoperisurilor, drumurilor si altor suprafete care acumuleaza caldura. Nu reprezinta temperatura aerului resimtita de oameni.

Componenta LST raspunde la intrebarea: **unde apar cele mai puternice semnale termice si cum difera ele intre sectoare si ani?**

## Date folosite

Repository-ul asteapta rasterele `lst_2015.tif`, `lst_2018.tif`, `lst_2020.tif`, `lst_2023.tif` si `lst_2025.tif`.

Fisierele finale se afla local in `backend/data/` si sunt ignorate de Git din cauza dimensiunii. Arhiva include si proiecte QGIS si fisiere Landsat ST_B10 folosite in fluxul de lucru.

## Flux de procesare

```text
Landsat Collection 2 Level-2 / ST_B10
        -> verificare CRS si NoData
        -> conversie la Celsius, daca rasterul este in valori scalate
        -> decupare pe Bucuresti sau sector
        -> statistici si distributie
        -> imagine cu paleta termica pentru harta
```

Backend-ul recunoaste un raster ST_B10 in valori scalate dupa ordinul de marime si aplica formula:

```text
LST [C] = valoare * 0.00341802 + 149.0 - 273.15
```

Daca rasterul contine deja valori realiste in Celsius, acestea sunt pastrate. Sunt acceptati doar pixelii finiti din intervalul de control `-80 ... 100 C`.

## Indicatori derivati

- temperatura medie, minima si maxima;
- distributia pixelilor pe intervale termice;
- procentul de suprafata foarte calda;
- diferenta dintre sector si media orasului din acelasi an.

Un hotspot este definit in aplicatie ca un pixel peste percentila 90 a tuturor pixelilor LST valizi din Bucuresti pentru anul analizat. Pragul se recalculeaza pentru fiecare an. Astfel, indicatorul identifica zonele cele mai calde relativ la contextul acelui an.

## Reasoning

Un prag fix, de exemplu 35 C, poate clasifica aproape tot orasul drept hotspot intr-o zi foarte calda. Percentila 90 pastreaza sensul de prioritate spatiala: evidentiaza cele mai calde 10% dintre suprafetele orasului si permite compararea sectoarelor in cadrul aceleiasi observatii.

Pentru analiza temporala, valoarea absoluta este completata de abaterea fata de media orasului. Acest indicator reduce riscul de a confunda o vara mai calda in intregul oras cu agravarea izolata a unui singur sector.

## Ce afiseaza aplicatia

- overlay termic georeferentiat;
- legenda in Celsius;
- contururile sectoarelor;
- indicatori medie/minim/maxim si hotspot;
- distributia termica;
- comparatie intre zone sau intre ani;
- legatura statistica cu NDVI.

## Limite

- LST nu este temperatura aerului.
- O singura observatie descrie conditiile momentului in care satelitul a trecut deasupra orasului.
- Norii, umbra, ora observatiei si pregatirea rasterului pot influenta comparatia.
- Diferenta dintre ani nu poate fi atribuita automat unei dezvoltari imobiliare.
- Un hotspot la nivel de sector nu stabileste situatia unei parcele.

## Contributia membrului LST

Pentru prezentarea echipei, aceasta parte poate include: selectarea scenelor, prelucrarea benzii termice, conversia in Celsius, decuparea pe Bucuresti, validarea georeferentierii, stilizarea QGIS si explicarea metodei hotspot.

## Referinte

- [USGS - Landsat Collection 2 Surface Temperature](https://www.usgs.gov/landsat-missions/landsat-collection-2-surface-temperature)
- [USGS - factorii de scalare pentru produsele Landsat Level-2](https://www.usgs.gov/faqs/how-do-i-use-a-scale-factor-landsat-level-2-science-products)
- [USGS - tutorial pentru scalarea LST si comparatia cu NDVI](https://www.usgs.gov/software/scaling-landsat-collection-2-level-2-data)
