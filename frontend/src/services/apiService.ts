import type { DashboardDataService } from '../types/api';
import { DataServiceError } from '../types/api';
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
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new DataServiceError('backend-unavailable', 'The data service could not be reached.');
  }

  if (response.status === 404) {
    throw new DataServiceError('not-found', 'No matching dataset is available.');
  }
  if (!response.ok) {
    throw new DataServiceError('backend-unavailable', 'The data service returned an unsuccessful response.');
  }

  try {
    return await response.json() as T;
  } catch {
    throw new DataServiceError('invalid-response', 'The data service response could not be read.');
  }
}

const query = (values: Record<string, string | number>) => new URLSearchParams(
  Object.entries(values).map(([key, value]) => [key, String(value)]),
).toString();

export const apiDashboardService: DashboardDataService = {
  mode: 'api',
  getAvailableYears: () => request<Year[]>('/years'),
  getDataAvailability: () => request<DataAvailability[]>('/availability'),
  getSectors: () => request<RegionSector[]>('/sectors'),
  getSectorBoundaries: () => request<SectorBoundaryCollection>('/boundaries/sectors'),
  getSectorStatistics: (sectorId, year, season) =>
    request<SectorStatistics>(`/statistics?${query({ sector: sectorId, year, season })}`),
  getLandCover: (sectorId, year, season) =>
    request<LandCoverEntry[]>(`/statistics/land-cover?${query({ sector: sectorId, year, season })}`),
  getMapLayer: (layerId: DataLayer, sectorId: SectorId, year: number, season: Season) =>
    request<MapLayerDescriptor>(`/map-layers/${layerId}?${query({ sector: sectorId, year, season })}`),
  getComparison: (comparisonRequest: ComparisonRequest) => request<ComparisonResult>('/comparisons', {
    method: 'POST',
    body: JSON.stringify(comparisonRequest),
  }),
  getReport: (stats: SectorStatistics, landCover: LandCoverEntry[]) => request<EnvironmentalReport>('/reports/explore', {
    method: 'POST',
    body: JSON.stringify({ sectorId: stats.sectorId, year: stats.year, season: stats.season, landCover }),
  }),
};
