import type {
  ComparisonRequest,
  ComparisonResult,
  DataAvailability,
  DataLayer,
  EnvironmentalReport,
  LandCoverEntry,
  MapLayerDescriptor,
  RegionSector,
  SectorBoundaryCollection,
  SectorId,
  SectorStatistics,
  Season,
  Year,
} from './index';

export interface DashboardDataService {
  readonly mode: 'demo' | 'api';
  getAvailableYears(): Promise<Year[]>;
  getDataAvailability(): Promise<DataAvailability[]>;
  getSectors(): Promise<RegionSector[]>;
  getSectorBoundaries(): Promise<SectorBoundaryCollection | null>;
  getSectorStatistics(sectorId: SectorId, year: number, season: Season): Promise<SectorStatistics>;
  getLandCover(sectorId: SectorId, year: number, season: Season): Promise<LandCoverEntry[]>;
  getMapLayer(layerId: DataLayer, sectorId: SectorId, year: number, season: Season): Promise<MapLayerDescriptor>;
  getComparison(request: ComparisonRequest): Promise<ComparisonResult>;
  getReport(stats: SectorStatistics, landCover: LandCoverEntry[]): Promise<EnvironmentalReport>;
}

export class DataServiceError extends Error {
  readonly code: 'backend-unavailable' | 'not-found' | 'invalid-response' | 'unknown';

  constructor(
    code: 'backend-unavailable' | 'not-found' | 'invalid-response' | 'unknown',
    message: string,
  ) {
    super(message);
    this.name = 'DataServiceError';
    this.code = code;
  }
}
