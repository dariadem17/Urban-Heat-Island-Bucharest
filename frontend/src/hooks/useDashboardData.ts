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
  const layerQuery = useQuery({
    queryKey: [serviceKey, 'map-layer', selectedLayer, selectedSector, selectedYear, season],
    queryFn: () => dataService.getMapLayer(selectedLayer, selectedSector, selectedYear, season),
    retry: false,
  });

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
