# NDVI - Normalized Difference Vegetation Index

## Rolul in proiect

NDVI este un indice spectral calculat din reflectanta in infrarosu apropiat si rosu. El evidentiaza intensitatea semnalului de vegetatie si permite compararea spatiala cu temperatura suprafetei.

Componenta NDVI raspunde la intrebarea: **unde exista semnal de vegetatie si cum se asociaza acesta cu LST?**

## Date folosite

Sunt disponibile rastere pentru 2015, 2018, 2020, 2023 si 2025. Metadatele indica:

- Landsat 8 Collection 2 Level-2;
- scene individuale din luna august;
- rezolutie de 30 m;
- CRS `EPSG:32635`;
- NoData `-9999`;
- decupare la limita administrativa a Bucurestiului;
- export pe grila folosita de LST.

## Calcul

Formula folosita este:

```text
NDVI = (NIR - RED) / (NIR + RED)
     = (SR_B5 - SR_B4) / (SR_B5 + SR_B4)
```

Reflectanta Landsat este scalata cu `0.0000275 - 0.2`. Norii si umbrele sunt mascate din `QA_PIXEL`, folosind bitii documentati in metadatele livrate. Valorile valide NDVI sunt pastrate in intervalul `-1 ... 1`.

## Indicatori derivati

- NDVI mediu, minim si maxim;
- distributie pe intervalele `<0.2`, `0.2-0.4`, `0.4-0.6`, `>0.6`;
- procentul pixelilor cu NDVI peste `0.4`;
- diferenta dintre sector si media Bucurestiului;
- distributie spectrala separata pentru anii fara Land Cover.

Intervalele NDVI sunt semnale spectrale. Ele nu trebuie redenumite automat cladiri, apa, arbori sau parc. Pentru aceste clase se foloseste produsul Land Cover separat.

## Relatia cu LST

Backend-ul suprapune rasterele LST si NDVI numai daca au CRS si grile compatibile. Sunt pastrati pixelii valizi comuni, fara a inventa valori si fara reesantionare. Apoi sunt calculate:

- corelatia Spearman, utila pentru o relatie monotona;
- corelatia Pearson, utila pentru relatia liniara;
- media LST pentru pixeli cu NDVI scazut si ridicat;
- un esantion determinist de puncte pentru grafic.

O corelatie negativa inseamna ca, in observatia analizata, valorile NDVI mai mari tind sa coincida cu suprafete mai reci. Aceasta este o asociere spatiala, nu dovada ca vegetatia a produs singura diferenta de temperatura.

## Reasoning

NDVI completeaza LST deoarece doua zone cu temperatura similara pot avea conditii de vegetatie foarte diferite. Pentru dezvoltatori, combinatia este mai utila decat oricare strat separat:

- LST ridicat + NDVI redus indica o zona care merita verificata pentru umbra si infrastructura verde;
- LST redus + NDVI ridicat indica elemente verzi care merita pastrate;
- rezultate mixte cer verificarea hartii si a parcelei, nu o recomandare automata.

## Ce afiseaza aplicatia

- overlay NDVI georeferentiat;
- legenda continua intre 0 si 1 pentru citirea vizuala;
- distributia valorilor;
- comparatii intre zone si ani;
- evolutia fata de media orasului;
- interpretarea comuna LST-NDVI.

## Limite

- NDVI nu este o clasificare Land Cover.
- Apa, solul, umbrele si suprafetele construite pot avea valori joase sau negative similare.
- Metadatele actuale descriu scene unice din august, nu medii complete ale verii.
- Corelatia LST-NDVI nu estimeaza efectul viitor al unui parc sau acoperis verde.

## Contributia membrului NDVI

Pentru prezentarea echipei, aceasta parte poate include: selectarea scenelor, calcularea indicelui din benzile Landsat, mascarea norilor, alinierea cu LST, exportul GeoTIFF, metadatele si interpretarea corelatiei LST-NDVI.

## Referinte

- [USGS - Landsat Normalized Difference Vegetation Index](https://www.usgs.gov/landsat-missions/landsat-normalized-difference-vegetation-index)
- [USGS - Landsat Collection 2 Level-2 Science Products](https://www.usgs.gov/landsat-missions/landsat-collection-2-level-2-science-products)
