import { useQuery } from '@tanstack/react-query';
import { dataService } from '../services/dataService';
import type { DataLayer, SectorId, Season, Year } from '../types';

export function useDashboardData(
  selectedSector: SectorId,
  selectedYear: Year,
  selectedLayer: DataLayer,
  season: Season = 'summer',
) {
  const serviceKey = dataService.mode;
  const sectorsQuery = useQuery({
    queryKey: [serviceKey, 'sectors'],
    queryFn: () => dataService.getSectors(),
  });
  const boundariesQuery = useQuery({
    queryKey: [serviceKey, 'sector-boundaries'],
    queryFn: () => dataService.getSectorBoundaries(),
    retry: false,
  });
  const yearsQuery = useQuery({
    queryKey: [serviceKey, 'available-years'],
    queryFn: () => dataService.getAvailableYears(),
  });
  const availabilityQuery = useQuery({
    queryKey: [serviceKey, 'data-availability'],
    queryFn: () => dataService.getDataAvailability(),
  });
  const statisticsQuery = useQuery({
    queryKey: [serviceKey, 'sector-statistics', selectedSector, selectedYear, season, selectedLayer],
    queryFn: () => dataService.getSectorStatistics(selectedSector, selectedYear, season),
  });
  const landCoverQuery = useQuery({
    queryKey: [serviceKey, 'land-cover', selectedSector, selectedYear, season],
    queryFn: () => dataService.getLandCover(selectedSector, selectedYear, season),
  });
  const lstLayerQuery = useQuery({
    queryKey: [serviceKey, 'map-layer', 'lst', selectedSector, selectedYear, season],
    queryFn: () => dataService.getMapLayer('lst', selectedSector, selectedYear, season),
    retry: false,
  });
  const ndviLayerQuery = useQuery({
    queryKey: [serviceKey, 'map-layer', 'ndvi', selectedSector, selectedYear, season],
    queryFn: () => dataService.getMapLayer('ndvi', selectedSector, selectedYear, season),
    retry: false,
  });
  const layerQuery = selectedLayer === 'lst' ? lstLayerQuery : ndviLayerQuery;

  return {
    availabilityQuery,
    boundariesQuery,
    landCoverQuery,
    layerQuery,
    sectorsQuery,
    statisticsQuery,
    yearsQuery,
  };
}
