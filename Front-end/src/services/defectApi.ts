import { apiClient } from '../lib/api';
import type {
  DefectCase,
  DefectCaseWithEvents,
  DefectStats,
  ReportDefectRequest,
  AssignDefectRequest,
  ResolveDefectRequest,
  VerifyDefectRequest
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

  // Assign defect to contractor
  assignDefect: async (id: string, data: AssignDefectRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/assign`, data);
    return response.data.data;
  },

  // Resolve defect
  resolveDefect: async (id: string, data: ResolveDefectRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/resolve`, data);
    return response.data.data;
  },

  // Verify defect
  verifyDefect: async (id: string, data: VerifyDefectRequest): Promise<DefectCase> => {
    const response = await apiClient.put(`/api/defects/cases/${id}/verify`, data);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<DefectStats> => {
    const response = await apiClient.get('/api/defects/stats');
    return response.data.data;
  }
};
