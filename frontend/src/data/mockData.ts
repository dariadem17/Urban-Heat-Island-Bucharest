import type { DataLayer, LandCoverEntry, MapLayerDescriptor, RegionSector, SectorId, Year } from '../types';

export const YEARS: Year[] = [2020, 2021, 2022, 2023, 2024, 2025];
export const SECTORS: RegionSector[] = [
  { id: 'all', name: 'Tot Bucurestiul', label: 'Tot Bucurestiul', center: [26.1025, 44.4268] },
  { id: '1', name: 'Sectorul 1', label: 'Sectorul 1', center: [26.04, 44.49] },
  { id: '2', name: 'Sectorul 2', label: 'Sectorul 2', center: [26.13, 44.47] },
  { id: '3', name: 'Sectorul 3', label: 'Sectorul 3', center: [26.17, 44.42] },
  { id: '4', name: 'Sectorul 4', label: 'Sectorul 4', center: [26.11, 44.37] },
  { id: '5', name: 'Sectorul 5', label: 'Sectorul 5', center: [26.04, 44.39] },
  { id: '6', name: 'Sectorul 6', label: 'Sectorul 6', center: [26.0, 44.44] },
];

export const LAYER_DESCRIPTORS: Record<
  DataLayer,
  Pick<MapLayerDescriptor, 'id' | 'name' | 'unit' | 'description' | 'legend'>
> = {
  lst: {
    id: 'lst',
    name: 'Temperatura suprafetei (LST)',
    unit: '°C',
    description: 'Temperatura suprafetei estimata din satelit, nu temperatura aerului.',
    legend: {
      kind: 'continuous',
      note: 'Scara demonstrativa; pragurile finale trebuie documentate in metadate.',
      items: [
        { label: 'Temperatura mai mica', color: '#60a5fa' },
        { label: 'Temperatura moderata', color: '#facc15' },
        { label: 'Temperatura mai mare', color: '#f97316' },
        { label: 'Temperatura maxima din scara', color: '#ef4444' },
      ],
    },
  },
  ndvi: {
    id: 'ndvi',
    name: 'Indicele de vegetatie (NDVI)',
    unit: 'NDVI',
    description: 'Indice spectral care indica prezenta vegetatiei.',
    legend: {
      kind: 'continuous',
      note: 'Scara demonstrativa; pragurile finale trebuie documentate in metadate.',
      items: [
        { label: 'Semnal slab de vegetatie', color: '#fef3c7' },
        { label: 'Semnal moderat de vegetatie', color: '#84cc16' },
        { label: 'Semnal puternic de vegetatie', color: '#4ade80' },
        { label: 'Semnal maxim din scara', color: '#166534' },
      ],
    },
  },
};

const landCover = (built: number, vegetation: number, green: number, water: number): LandCoverEntry[] => [
  { categoryId: 'built-up', label: 'Zone construite', percentage: built, color: '#64748b' },
  { categoryId: 'vegetation', label: 'Vegetatie', percentage: vegetation, color: '#22c55e' },
  { categoryId: 'urban-green', label: 'Parcuri / spatii verzi', percentage: green, color: '#84cc16' },
  { categoryId: 'water', label: 'Apa', percentage: water, color: '#38bdf8' },
  { categoryId: 'other', label: 'Sol descoperit / altele', percentage: 100 - built - vegetation - green - water, color: '#d6b36e' },
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
