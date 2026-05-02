import { apiClient } from '../lib/api';
import type {
  DefectCase,
  DefectCaseWithEvents,
  DefectStats,
  ReportDefectRequest,
  ScheduleRepairRequest,
  CompleteRepairRequest,
  CloseDefectRequest
} from '../types/defect.types';

export const defectApi = {
  // Get all defects
  getAllDefects: async (filters?: {
    status?: string;
    priority?: string;
    category?: string;
    unitId?: string;
  }): Promise<DefectCase[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.unitId) params.append('unitId', filters.unitId);

    const response = await apiClient.get(`/api/defects/cases?${params.toString()}`);
    return response.data.data;
  },

  // Get single defect with events
  getDefectById: async (id: string): Promise<DefectCaseWithEvents> => {
    const response = await apiClient.get(`/api/defects/cases/${id}`);
    return response.data.data;
  },

  // Report new defect
  reportDefect: async (data: ReportDefectRequest): Promise<DefectCase> => {
    const response = await apiClient.post('/api/defects/cases', data);
    return response.data.data;
  },

  // Schedule repair for defect
  scheduleRepair: async (id: string, data: ScheduleRepairRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/schedule`, data);
    return response.data.data;
  },

  // Complete repair
  completeRepair: async (id: string, data: CompleteRepairRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/complete-repair`, data);
    return response.data.data;
  },

  // Close defect case
  closeDefect: async (id: string, data: CloseDefectRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/close`, data);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<DefectStats> => {
    const response = await apiClient.get('/api/defects/stats');
    return response.data.data;
  }
};
