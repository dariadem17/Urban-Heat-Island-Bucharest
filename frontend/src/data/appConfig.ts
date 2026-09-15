import type { DataLayer, Season } from '../types';

export const PRIMARY_LAYERS: DataLayer[] = ['lst', 'ndvi'];
export const SUPPORTED_SEASONS: Season[] = ['summer'];
export const LAYER_NAMES: Record<DataLayer, string> = {
  lst: 'Temperatura suprafetei (LST)',
  ndvi: 'Indicele de vegetatie (NDVI)',
};
