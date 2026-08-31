import { apiDashboardService } from './apiService';
import { mockDashboardService } from './mockApi';
import type { DashboardDataService } from '../types/api';

const configuredMode = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'demo';

export const dataService: DashboardDataService = configuredMode === 'api'
  ? apiDashboardService
  : mockDashboardService;

export const dataMode = dataService.mode;
