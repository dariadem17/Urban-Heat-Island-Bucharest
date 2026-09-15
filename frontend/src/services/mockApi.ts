import { LAYER_DESCRIPTORS, MOCK_LAND_COVER, SECTORS, YEARS } from '../data/mockData';
import type { DashboardDataService } from '../types/api';
import { DataServiceError } from '../types/api';
import type {
  ComparisonMetric,
  ComparisonRequest,
  ComparisonResult,
  DataAvailability,
  DataLayer,
  EnvironmentalReport,
  LandCoverEntry,
  MapLayerDescriptor,
  ReportSection,
  SectorBoundaryCollection,
  SectorId,
  SectorStatistics,
  Season,
} from '../types';

const DEMO_AVAILABILITY: DataAvailability[] = YEARS.map((year) => ({
  year,
  season: 'summer',
  layers: { lst: 'available', ndvi: year === 2021 ? 'processing' : 'available' },
  landCover: year === 2020 ? 'unavailable' : 'available',
}));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const sectorScale = (sectorId: SectorId) => sectorId === 'all' ? 3.5 : Number(sectorId);
const sectorLabel = (sectorId: SectorId) => sectorId === 'all' ? 'Tot Bucurestiul' : `Sectorul ${sectorId}`;

function statisticsFor(sectorId: SectorId, year: number, season: Season): SectorStatistics {
  const sector = sectorScale(sectorId);
  const yearOffset = year - 2020;
  const avgLst = Number((29 + sector * 1.1 + yearOffset * 0.45).toFixed(1));
  const minLst = Number((22 + sector * 0.55 + yearOffset * 0.12).toFixed(1));
  const maxLst = Number((37 + sector * 1.15 + yearOffset * 0.65).toFixed(1));
  const avgNdvi = Number(clamp(0.48 + (6 - sector) * 0.035 + yearOffset * 0.008, 0.2, 0.87).toFixed(2));

  return {
    sectorId,
    year,
    season,
    avgLst,
    minLst,
    maxLst,
    avgNdvi,
    minNdvi: Number(clamp(avgNdvi - 0.28, -1, 1).toFixed(2)),
    maxNdvi: Number(clamp(avgNdvi + 0.25, -1, 1).toFixed(2)),
    hotspotAreaPct: Number(clamp(17 + sector * 2.1 + yearOffset * 0.8, 8, 45).toFixed(1)),
    vegetatedAreaPct: Number(clamp(25 + (6 - sector) * 2.5 + yearOffset * 0.3, 10, 60).toFixed(1)),
    lstDistribution: [
      { label: '18–25°C', value: Math.round(22 + sector - yearOffset * 0.4) },
      { label: '25–30°C', value: Math.round(31 + sector * 1.2) },
      { label: '30–35°C', value: Math.round(27 + sector + yearOffset * 0.6) },
      { label: '35–40°C', value: Math.round(14 + sector + yearOffset * 0.7) },
      { label: '>40°C', value: Math.round(5 + yearOffset * 0.5) },
    ],
    ndviDistribution: [
      { label: '<0.2', value: Math.round(18 + sector) },
      { label: '0.2–0.4', value: Math.round(29 + sector) },
      { label: '0.4–0.6', value: Math.round(31 + (6 - sector)) },
      { label: '0.6–0.8', value: Math.round(18 + (6 - sector) * 1.5) },
      { label: '>0.8', value: Math.round(4 + (6 - sector) * 0.4) },
    ],
    ndviVsLst: [
      { ndvi: 0.2, lst: 37.4, label: 'Exemplul A' },
      { ndvi: 0.35, lst: 34.2, label: 'Exemplul B' },
      { ndvi: 0.48, lst: 31.8, label: 'Exemplul C' },
      { ndvi: 0.6, lst: 29.1, label: 'Exemplul D' },
      { ndvi: 0.74, lst: 27.3, label: 'Exemplul E' },
    ],
  };
}

function landCoverFor(sectorId: SectorId, year: number): LandCoverEntry[] {
  if (year === 2020) return [];
  const source = MOCK_LAND_COVER[sectorId];
  const offset = year - 2020;
  const adjusted = source.map((entry, index) => ({
    ...entry,
    percentage: clamp(entry.percentage + (index % 2 === 0 ? 1 : -1) * offset * 0.2, 1, 90),
  }));
  const total = adjusted.reduce((sum, entry) => sum + entry.percentage, 0);
  return adjusted.map((entry) => ({ ...entry, percentage: Number((entry.percentage / total * 100).toFixed(1)) }));
}

function layerFor(layerId: DataLayer, sectorId: SectorId, year: number, season: Season): MapLayerDescriptor {
  const descriptor = LAYER_DESCRIPTORS[layerId];
  const availability = DEMO_AVAILABILITY.find((entry) => entry.year === year)?.layers[layerId] ?? 'unavailable';
  return {
    ...descriptor,
    year,
    season,
    sectorId,
    source: { kind: 'none' },
    availability,
    isDemo: true,
    description: `${descriptor.description} Imaginea stiintifica asteapta rasterul procesat.`,
  };
}

function dominantLandCover(entries: LandCoverEntry[]) {
  return entries.reduce<LandCoverEntry | null>((largest, entry) => !largest || entry.percentage > largest.percentage ? entry : largest, null);
}

function reportFor(stats: SectorStatistics, landCover: LandCoverEntry[]): EnvironmentalReport {
  const location = sectorLabel(stats.sectorId);
  const latestYear = YEARS.at(-1) ?? 2025;
  if (stats.year < latestYear) {
    const latest = statisticsFor(stats.sectorId, latestYear, stats.season);
    const lstReading = stats.avgLst !== null && latest.avgLst !== null ? `LST mediu: ${stats.avgLst.toFixed(1)} -> ${latest.avgLst.toFixed(1)} °C.` : 'LST nu este complet.';
    const ndviReading = stats.avgNdvi !== null && latest.avgNdvi !== null ? `NDVI mediu: ${stats.avgNdvi.toFixed(3)} -> ${latest.avgNdvi.toFixed(3)}.` : 'NDVI nu este complet.';
    return { title: `${location} - ${stats.year}`, mode: 'historical', summary: `${stats.year} este un reper istoric demonstrativ. Fata de ${latestYear}, ${lstReading} ${ndviReading}`, sections: [{ title: 'Ce ramane relevant azi', body: `Foloseste valorile din ${latestYear} pentru proiectele actuale; acest exemplu sintetic nu sustine o prognoza.` }], dataNote: 'Date sintetice demonstrative. Diferentele dintre ani nu arata efectul unei dezvoltari.' };
  }
  const dominant = dominantLandCover(landCover);
  const built = landCover.find((entry) => entry.categoryId === 'built-up')?.percentage;
  const heat = stats.hotspotAreaPct === null ? 'Fara estimare a hotspoturilor' : `${stats.hotspotAreaPct}% din zona este foarte calda`;
  const cover = built === undefined ? 'fara estimare a suprafetelor construite' : `${built}% suprafete construite`;
  const sections: ReportSection[] = [
    { title: 'Ce sugereaza indicatorii', body: `${location}: ${heat}, ${cover}${dominant ? `, iar categoria dominanta este ${dominant.label.toLowerCase()}` : ''}. Compara harta LST cu NDVI pentru a cauta unde caldura coincide cu vegetatia redusa.` },
    { title: 'Ce sa verifici pentru proiect', body: 'Verifica umbra si pavajul pe teren. Daca zona este fierbinte si are putina vegetatie, rezerva loc pentru arbori, sol permeabil si trasee umbrite.' },
  ];
  return { title: `${location} - ${stats.year}`, mode: 'current', sections, dataNote: `Date sintetice demonstrative, nu o evaluare a unei parcele. Verifica datele reale inainte de decizia de construire.` };
}

async function loadStaticBoundaries(): Promise<SectorBoundaryCollection | null> {
  try {
    const response = await fetch('/data/bucharest-sectors.geojson');
    if (!response.ok) return null;
    const value = await response.json() as Partial<SectorBoundaryCollection>;
    return value.type === 'FeatureCollection' && Array.isArray(value.features) ? value as SectorBoundaryCollection : null;
  } catch {
    return null;
  }
}

const metric = (id: string, label: string, primary: number | null, secondary: number | null, unit: ComparisonMetric['unit']): ComparisonMetric | null =>
  primary === null || secondary === null ? null : { id, label, primary, secondary, delta: Number((secondary - primary).toFixed(unit === 'NDVI' ? 2 : 1)), unit };

export const mockDashboardService: DashboardDataService = {
  mode: 'demo',
  getAvailableYears: async () => [...YEARS],
  getDataAvailability: async () => DEMO_AVAILABILITY.map((entry) => ({ ...entry, layers: { ...entry.layers } })),
  getSectors: async () => [...SECTORS],
  getSectorBoundaries: loadStaticBoundaries,
  getSectorStatistics: async (sectorId, year, season) => statisticsFor(sectorId, year, season),
  getLandCover: async (sectorId, year) => landCoverFor(sectorId, year),
  getMapLayer: async (layerId, sectorId, year, season) => layerFor(layerId, sectorId, year, season),
  getReport: async (stats, landCover) => reportFor(stats, landCover),

  async getComparison(request: ComparisonRequest): Promise<ComparisonResult> {
    const secondarySector = request.type === 'sector' ? request.secondarySector ?? '6' : request.primarySector;
    const secondaryYear = request.type === 'year' ? request.secondaryYear ?? request.primaryYear : request.primaryYear;
    const primaryAvailability = DEMO_AVAILABILITY.find((entry) => entry.year === request.primaryYear)?.layers[request.layer];
    const secondaryAvailability = DEMO_AVAILABILITY.find((entry) => entry.year === secondaryYear)?.layers[request.layer];
    if (primaryAvailability !== 'available' || secondaryAvailability !== 'available') {
      throw new DataServiceError('not-found', 'Unul sau ambele seturi de date nu sunt disponibile.');
    }
    const primaryStats = statisticsFor(request.primarySector, request.primaryYear, request.season);
    const secondaryStats = statisticsFor(secondarySector, secondaryYear, request.season);
    const primaryLandCover = landCoverFor(request.primarySector, request.primaryYear);
    const secondaryLandCover = landCoverFor(secondarySector, secondaryYear);
    const primaryBuilt = primaryLandCover.find((entry) => entry.categoryId === 'built-up')?.percentage ?? null;
    const secondaryBuilt = secondaryLandCover.find((entry) => entry.categoryId === 'built-up')?.percentage ?? null;
    const primaryVegetation = primaryLandCover.find((entry) => entry.categoryId === 'vegetation')?.percentage ?? null;
    const secondaryVegetation = secondaryLandCover.find((entry) => entry.categoryId === 'vegetation')?.percentage ?? null;
    const candidates = request.layer === 'lst'
      ? [
          metric('avg-lst', 'LST mediu', primaryStats.avgLst, secondaryStats.avgLst, '°C'),
          metric('min-lst', 'LST minim', primaryStats.minLst, secondaryStats.minLst, '°C'),
          metric('max-lst', 'LST maxim', primaryStats.maxLst, secondaryStats.maxLst, '°C'),
          metric('hotspot', 'Suprafata foarte calda', primaryStats.hotspotAreaPct, secondaryStats.hotspotAreaPct, 'percentage points'),
          metric('avg-ndvi', 'NDVI mediu', primaryStats.avgNdvi, secondaryStats.avgNdvi, 'NDVI'),
        ]
      : [
          metric('avg-ndvi', 'NDVI mediu', primaryStats.avgNdvi, secondaryStats.avgNdvi, 'NDVI'),
          metric('min-ndvi', 'NDVI minim', primaryStats.minNdvi, secondaryStats.minNdvi, 'NDVI'),
          metric('max-ndvi', 'NDVI maxim', primaryStats.maxNdvi, secondaryStats.maxNdvi, 'NDVI'),
          metric('vegetated', 'Semnal de vegetatie', primaryStats.vegetatedAreaPct, secondaryStats.vegetatedAreaPct, 'percentage points'),
          metric('avg-lst', 'LST mediu', primaryStats.avgLst, secondaryStats.avgLst, '°C'),
        ];
    const contextual = [
      metric('built-up', 'Zone construite', primaryBuilt, secondaryBuilt, 'percentage points'),
      metric('vegetation', 'Vegetatie', primaryVegetation, secondaryVegetation, 'percentage points'),
    ];
    const primaryLabel = `${sectorLabel(request.primarySector)} · Vara ${request.primaryYear}`;
    const secondaryLabel = `${sectorLabel(secondarySector)} · Vara ${secondaryYear}`;
    const metrics = [...candidates, ...contextual].filter((entry): entry is ComparisonMetric => entry !== null);
    const temperatureDelta = primaryStats.avgLst !== null && secondaryStats.avgLst !== null ? secondaryStats.avgLst - primaryStats.avgLst : null;
    const temperatureReading = temperatureDelta === null || primaryStats.avgLst === null || secondaryStats.avgLst === null
      ? 'LST nu este disponibil pentru ambele selectii'
      : Math.abs(temperatureDelta) < 0.3
        ? `LST mediu este aproape egal (${secondaryStats.avgLst.toFixed(1)} fata de ${primaryStats.avgLst.toFixed(1)} °C)`
        : `LST mediu in B este cu ${Math.abs(temperatureDelta).toFixed(1)} °C ${temperatureDelta > 0 ? 'mai mare' : 'mai mic'}`;
    const vegetationReading = primaryStats.avgNdvi !== null && secondaryStats.avgNdvi !== null
      ? `NDVI mediu in B este ${secondaryStats.avgNdvi.toFixed(3)} fata de ${primaryStats.avgNdvi.toFixed(3)} in A`
      : 'NDVI nu este disponibil pentru ambele selectii';
    const coverReading = primaryBuilt !== null && secondaryBuilt !== null
      ? `Suprafetele construite reprezinta ${secondaryBuilt.toFixed(1)}% in B fata de ${primaryBuilt.toFixed(1)}% in A`
      : 'Land Cover nu este disponibil pentru ambele selectii';
    const comparisonReading = `${coverReading}. ${vegetationReading}; ${temperatureReading}.`;
    const projectReading = secondaryBuilt !== null && secondaryBuilt >= 70
      ? `In ${sectorLabel(secondarySector)}, verifica daca parcela are loc pentru arbori si sol permeabil. Daca spatiul este limitat, studiaza un acoperis verde doar daca structura permite si umbreste accesul pietonal.`
      : temperatureDelta !== null && temperatureDelta > 0.3
        ? `In ${sectorLabel(secondarySector)}, localizeaza zonele cele mai calde si prioritizeaza umbra, arborii si reducerea pavajului expus.`
        : `In ${sectorLabel(secondarySector)}, pastreaza arborii si solul permeabil de pe amplasament; verifica harta hotspoturilor inainte de proiectare.`;
    const historicalSectorComparison = request.type === 'sector' && request.primaryYear < (YEARS.at(-1) ?? 2025);
    const timeline = request.type === 'year' ? YEARS.map((year) => {
      const area = statisticsFor(request.primarySector, year, request.season);
      const city = statisticsFor('all', year, request.season);
      const cover = landCoverFor(request.primarySector, year);
      return {
        year,
        lst: area.avgLst,
        ndvi: area.avgNdvi,
        lstVsCity: area.avgLst !== null && city.avgLst !== null ? Number((area.avgLst - city.avgLst).toFixed(2)) : null,
        ndviVsCity: area.avgNdvi !== null && city.avgNdvi !== null ? Number((area.avgNdvi - city.avgNdvi).toFixed(3)) : null,
        builtPct: cover.find((entry) => entry.categoryId === 'built-up')?.percentage ?? null,
        treesPct: cover.find((entry) => entry.categoryId === 'trees')?.percentage ?? null,
      };
    }) : [];

    return {
      type: request.type,
      layer: request.layer,
      title: request.type === 'sector' ? `${sectorLabel(request.primarySector)} fata de ${sectorLabel(secondarySector)}` : `${sectorLabel(request.primarySector)} · ${request.primaryYear} fata de ${secondaryYear}`,
      context: `Comparatie ${request.layer.toUpperCase()} folosind date demonstrative de vara.`,
      primary: { label: primaryLabel, sectorId: request.primarySector, year: request.primaryYear, season: request.season, statistics: primaryStats, landCover: primaryLandCover, mapLayer: layerFor(request.layer, request.primarySector, request.primaryYear, request.season) },
      secondary: { label: secondaryLabel, sectorId: secondarySector, year: secondaryYear, season: request.season, statistics: secondaryStats, landCover: secondaryLandCover, mapLayer: layerFor(request.layer, secondarySector, secondaryYear, request.season) },
      metrics,
      timeline,
      sharedLegend: LAYER_DESCRIPTORS[request.layer].legend,
      report: [
        { title: request.type === 'year' ? 'Evolutia observata' : 'Ce spun datele impreuna', body: comparisonReading },
        { title: request.type === 'year' ? 'Semnal pentru proiectele actuale' : historicalSectorComparison ? 'Cum folosesti acest reper' : 'Ce inseamna pentru proiect', body: request.type === 'year' ? `Pentru deciziile actuale, priveste anul ${YEARS.at(-1) ?? 2025} si verifica amplasamentul. Aceasta serie este demonstrativa si nu permite o prognoza.` : historicalSectorComparison ? `Aceasta comparatie descrie anul ${request.primaryYear}. Pentru un proiect nou, compara aceleasi sectoare in ${YEARS.at(-1) ?? 2025} si verifica daca diferenta persista.` : projectReading },
      ],
      isDemo: true,
    };
  },
};
