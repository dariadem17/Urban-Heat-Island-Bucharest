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
const sectorLabel = (sectorId: SectorId) => sectorId === 'all' ? 'All Bucharest' : `Sector ${sectorId}`;

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
      { ndvi: 0.2, lst: 37.4, label: 'Sample A' },
      { ndvi: 0.35, lst: 34.2, label: 'Sample B' },
      { ndvi: 0.48, lst: 31.8, label: 'Sample C' },
      { ndvi: 0.6, lst: 29.1, label: 'Sample D' },
      { ndvi: 0.74, lst: 27.3, label: 'Sample E' },
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
    description: `${descriptor.description} Scientific imagery awaits the processed raster source.`,
  };
}

function dominantLandCover(entries: LandCoverEntry[]) {
  return entries.reduce<LandCoverEntry | null>((largest, entry) => !largest || entry.percentage > largest.percentage ? entry : largest, null);
}

function reportFor(stats: SectorStatistics, landCover: LandCoverEntry[]): EnvironmentalReport {
  const location = sectorLabel(stats.sectorId);
  const dominant = dominantLandCover(landCover);
  const sections: ReportSection[] = [
    { title: 'Environmental summary', body: `${location} is shown for the ${stats.season} ${stats.year} preview dataset.` },
    { title: 'Thermal signal', body: stats.avgLst === null ? 'LST statistics are unavailable.' : `The preview dataset has an average land surface temperature of ${stats.avgLst}°C, with values from ${stats.minLst}°C to ${stats.maxLst}°C.` },
    { title: 'Vegetation signal', body: stats.avgNdvi === null ? 'NDVI statistics are unavailable.' : `The preview dataset has an average NDVI of ${stats.avgNdvi}, with a range from ${stats.minNdvi} to ${stats.maxNdvi}.` },
    { title: 'Land-cover context', body: dominant ? `${dominant.label} is the largest preview category at ${dominant.percentage}%.` : 'Land-cover data is unavailable for this dataset.' },
    { title: 'What to investigate', body: 'For this preview only: inspect shade, existing vegetation, and exposed paving at site level. Real intervention priorities require validated raster and Land Cover evidence.' },
    { title: 'Data limitations', body: 'This is synthetic demo data. It cannot establish actual heat exposure, a vegetation–temperature relationship, or an intervention priority. LST represents surface temperature, not air temperature.' },
  ];
  return { title: 'Environmental summary', sections, dataNote: `Preview dataset · ${location} · Summer ${stats.year}. Values are deterministic demo data.` };
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
      throw new DataServiceError('not-found', 'One or both comparison datasets are unavailable.');
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
          metric('avg-lst', 'Average LST', primaryStats.avgLst, secondaryStats.avgLst, '°C'),
          metric('min-lst', 'Minimum LST', primaryStats.minLst, secondaryStats.minLst, '°C'),
          metric('max-lst', 'Maximum LST', primaryStats.maxLst, secondaryStats.maxLst, '°C'),
          metric('hotspot', 'Hotspot area', primaryStats.hotspotAreaPct, secondaryStats.hotspotAreaPct, 'percentage points'),
          metric('avg-ndvi', 'Average NDVI', primaryStats.avgNdvi, secondaryStats.avgNdvi, 'NDVI'),
        ]
      : [
          metric('avg-ndvi', 'Average NDVI', primaryStats.avgNdvi, secondaryStats.avgNdvi, 'NDVI'),
          metric('min-ndvi', 'Minimum NDVI', primaryStats.minNdvi, secondaryStats.minNdvi, 'NDVI'),
          metric('max-ndvi', 'Maximum NDVI', primaryStats.maxNdvi, secondaryStats.maxNdvi, 'NDVI'),
          metric('vegetated', 'Vegetated area', primaryStats.vegetatedAreaPct, secondaryStats.vegetatedAreaPct, 'percentage points'),
          metric('avg-lst', 'Average LST', primaryStats.avgLst, secondaryStats.avgLst, '°C'),
        ];
    const contextual = [
      metric('built-up', 'Built-up share', primaryBuilt, secondaryBuilt, 'percentage points'),
      metric('vegetation', 'Vegetation share', primaryVegetation, secondaryVegetation, 'percentage points'),
    ];
    const primaryLabel = `${sectorLabel(request.primarySector)} · Summer ${request.primaryYear}`;
    const secondaryLabel = `${sectorLabel(secondarySector)} · Summer ${secondaryYear}`;
    const metrics = [...candidates, ...contextual].filter((entry): entry is ComparisonMetric => entry !== null);
    const keyMetric = metrics[0];

    return {
      type: request.type,
      layer: request.layer,
      title: request.type === 'sector' ? `${sectorLabel(request.primarySector)} vs ${sectorLabel(secondarySector)}` : `${sectorLabel(request.primarySector)} · ${request.primaryYear} vs ${secondaryYear}`,
      context: `${request.layer.toUpperCase()} comparison using summer preview datasets.`,
      primary: { label: primaryLabel, sectorId: request.primarySector, year: request.primaryYear, season: request.season, statistics: primaryStats, landCover: primaryLandCover, mapLayer: layerFor(request.layer, request.primarySector, request.primaryYear, request.season) },
      secondary: { label: secondaryLabel, sectorId: secondarySector, year: secondaryYear, season: request.season, statistics: secondaryStats, landCover: secondaryLandCover, mapLayer: layerFor(request.layer, secondarySector, secondaryYear, request.season) },
      metrics,
      sharedLegend: LAYER_DESCRIPTORS[request.layer].legend,
      report: [
        { title: 'Comparison summary', body: `${primaryLabel} is compared with ${secondaryLabel}.` },
        { title: 'Key differences', body: keyMetric ? `${keyMetric.label} differs by ${keyMetric.delta > 0 ? '+' : ''}${keyMetric.delta} ${keyMetric.unit}.` : 'Comparable metrics are unavailable.' },
        { title: 'Interpretation', body: 'Differences describe the selected preview datasets only and do not establish causality.' },
      ],
      isDemo: true,
    };
  },
};
