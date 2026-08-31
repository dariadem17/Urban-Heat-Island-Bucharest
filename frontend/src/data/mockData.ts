import type { DataLayer, LandCoverEntry, MapLayerDescriptor, RegionSector, SectorId, Year } from '../types';

export const YEARS: Year[] = [2020, 2021, 2022, 2023, 2024, 2025];
export const SECTORS: RegionSector[] = [
  { id: 'all', name: 'All Bucharest', label: 'All Bucharest', center: [26.1025, 44.4268] },
  { id: '1', name: 'Sector 1', label: 'Sector 1', center: [26.04, 44.49] },
  { id: '2', name: 'Sector 2', label: 'Sector 2', center: [26.13, 44.47] },
  { id: '3', name: 'Sector 3', label: 'Sector 3', center: [26.17, 44.42] },
  { id: '4', name: 'Sector 4', label: 'Sector 4', center: [26.11, 44.37] },
  { id: '5', name: 'Sector 5', label: 'Sector 5', center: [26.04, 44.39] },
  { id: '6', name: 'Sector 6', label: 'Sector 6', center: [26.0, 44.44] },
];

export const LAYER_DESCRIPTORS: Record<
  DataLayer,
  Pick<MapLayerDescriptor, 'id' | 'name' | 'unit' | 'description' | 'legend'>
> = {
  lst: {
    id: 'lst',
    name: 'Land Surface Temperature',
    unit: '°C',
    description: 'Satellite-derived surface temperature, not ambient air temperature.',
    legend: {
      kind: 'continuous',
      note: 'Preview scale — production thresholds must come from dataset metadata.',
      items: [
        { label: 'Lower surface temperature', color: '#60a5fa' },
        { label: 'Moderate surface temperature', color: '#facc15' },
        { label: 'Higher surface temperature', color: '#f97316' },
        { label: 'Highest preview band', color: '#ef4444' },
      ],
    },
  },
  ndvi: {
    id: 'ndvi',
    name: 'Normalized Difference Vegetation Index',
    unit: 'NDVI',
    description: 'Spectral-reflectance indicator used to characterize vegetation signal.',
    legend: {
      kind: 'continuous',
      note: 'Preview scale — production thresholds must come from dataset metadata.',
      items: [
        { label: 'Lower vegetation signal', color: '#fef3c7' },
        { label: 'Moderate vegetation signal', color: '#84cc16' },
        { label: 'Higher vegetation signal', color: '#4ade80' },
        { label: 'Highest preview band', color: '#166534' },
      ],
    },
  },
};

const landCover = (built: number, vegetation: number, green: number, water: number): LandCoverEntry[] => [
  { categoryId: 'built-up', label: 'Built-up', percentage: built, color: '#64748b' },
  { categoryId: 'vegetation', label: 'Vegetation', percentage: vegetation, color: '#22c55e' },
  { categoryId: 'urban-green', label: 'Parks / urban green space', percentage: green, color: '#84cc16' },
  { categoryId: 'water', label: 'Water', percentage: water, color: '#38bdf8' },
  { categoryId: 'other', label: 'Bare soil / other', percentage: 100 - built - vegetation - green - water, color: '#d6b36e' },
];

export const MOCK_LAND_COVER: Record<SectorId, LandCoverEntry[]> = {
  all: landCover(52, 26, 12, 4),
  '1': landCover(61, 18, 10, 3),
  '2': landCover(49, 31, 10, 5),
  '3': landCover(56, 25, 9, 4),
  '4': landCover(58, 22, 8, 4),
  '5': landCover(46, 34, 12, 5),
  '6': landCover(44, 36, 11, 5),
};
