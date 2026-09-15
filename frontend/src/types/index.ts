export type SectorId = 'all' | '1' | '2' | '3' | '4' | '5' | '6';
export type Season = 'summer';
export type DataLayer = 'lst' | 'ndvi';
export type Year = 2015 | 2018 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025;
export type DataMode = 'demo' | 'api';
export type AvailabilityStatus = 'available' | 'unavailable' | 'processing';
export type LayerAvailability = Record<DataLayer, AvailabilityStatus>;

export type RegionSector = {
  id: SectorId;
  name: string;
  label: string;
  center?: [number, number];
};

export type LayerLegendItem = { label: string; color: string; value?: number | string };
export type LayerLegend = {
  kind: 'continuous' | 'categorical';
  items: LayerLegendItem[];
  note?: string;
  domain?: [number, number];
};

export type GeographicBounds = [[number, number], [number, number]];
export type MapLayerSource =
  | { kind: 'none' }
  | { kind: 'image'; url: string; bounds: GeographicBounds }
  | { kind: 'raster-tiles'; tiles: string[]; tileSize?: number; minZoom?: number; maxZoom?: number }
  | { kind: 'geotiff'; url: string; bounds?: GeographicBounds };

export type MapLayerDescriptor = {
  id: DataLayer;
  name: string;
  unit: string;
  description: string;
  year: number;
  season: Season;
  sectorId: SectorId;
  source: MapLayerSource;
  legend: LayerLegend;
  availability: AvailabilityStatus;
  isDemo: boolean;
};

export type DataAvailability = {
  year: Year;
  season: Season;
  layers: LayerAvailability;
  landCover: AvailabilityStatus;
};

export type BoundaryFeatureProperties = { sectorId: Exclude<SectorId, 'all'>; name: string };
export type BoundaryFeature = {
  type: 'Feature';
  properties: BoundaryFeatureProperties;
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
};
export type SectorBoundaryCollection = { type: 'FeatureCollection'; features: BoundaryFeature[] };

export type DistributionBin = { label: string; value: number };
export type RelationshipPoint = { ndvi: number; lst: number; label?: string };
export type LandCoverEntry = {
  label: string;
  percentage: number;
  color: string;
  categoryId?: string;
  sourceYear?: number;
  sourceName?: string;
  sourceUrl?: string;
  period?: string;
};

export type SectorStatistics = {
  sectorId: SectorId;
  year: number;
  season: Season;
  avgLst: number | null;
  minLst: number | null;
  maxLst: number | null;
  avgNdvi: number | null;
  minNdvi: number | null;
  maxNdvi: number | null;
  hotspotAreaPct: number | null;
  hotspotDefinition?: string;
  vegetatedAreaPct: number | null;
  lstDistribution: DistributionBin[];
  ndviDistribution: DistributionBin[];
  ndviSurfaceBreakdown?: LandCoverEntry[];
  ndviVsLst: RelationshipPoint[];
  lstNdviRelationship?: {
    available: boolean;
    spearmanRho?: number;
    sampleCount?: number;
    summary?: string;
    reason?: string;
    contrast?: { lowNdviMeanLstC: number; highNdviMeanLstC: number; highMinusLowC: number } | null;
  };
};

export type ReportSection = { title: string; body: string };
export type EnvironmentalReport = {
  title: string;
  mode?: 'current' | 'historical';
  summary?: string;
  temporalSignal?: string | null;
  sections: ReportSection[];
  dataNote: string;
  assessment?: {
    area: { code: string; name: string };
    thermal: { available: boolean; avgLstC: number | null; deltaVsCityC: number | null; hotspotAreaPct: number | null; score: number | null; level: string | null };
    vegetation: { available: boolean; avgNdvi: number | null; deltaVsCity: number | null; deficitScore: number | null; level: string | null };
    cooling: {
      available: boolean;
      pearsonR?: number;
      spearmanRho?: number;
      sampleCount?: number;
      strength?: string;
      summary?: string;
      reason?: string;
      contrast?: { lowNdviMeanLstC: number; highNdviMeanLstC: number; highMinusLowC: number } | null;
    };
    landCover?: { available: boolean; sourceYear: number | null; period: string | null; entries: LandCoverEntry[] };
    builtPressure: { available: boolean; builtPct?: number | null; reason?: string };
    resilience: { available: boolean; reason?: string };
    intervention: { priority: string; recommendations: string[] };
    benchmark: { method: string; prioritySectors?: { sector: SectorId }[] };
  };
};

export type ComparisonRequest = {
  type: 'sector' | 'year';
  layer: DataLayer;
  primarySector: SectorId;
  secondarySector?: SectorId;
  primaryYear: number;
  secondaryYear?: number;
  season: Season;
};

export type ComparisonMetric = {
  id: string;
  label: string;
  primary: number;
  secondary: number;
  delta: number;
  unit: '°C' | 'NDVI' | '%' | 'percentage points';
};

export type ComparisonDataset = {
  label: string;
  sectorId: SectorId;
  year: number;
  season: Season;
  statistics: SectorStatistics;
  landCover: LandCoverEntry[];
  mapLayer: MapLayerDescriptor;
};

export type ComparisonResult = {
  type: ComparisonRequest['type'];
  layer: DataLayer;
  title: string;
  context: string;
  primary: ComparisonDataset;
  secondary: ComparisonDataset;
  metrics: ComparisonMetric[];
  timeline?: { year: number; lst: number | null; ndvi: number | null; lstVsCity: number | null; ndviVsCity: number | null; builtPct: number | null; treesPct: number | null }[];
  sharedLegend: LayerLegend;
  report: ReportSection[];
  isDemo: boolean;
};
