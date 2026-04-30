import { apiClient } from '../lib/api';
import type { HandoverCase, HandoverCaseWithEvents, HandoverStats, CompleteHandoverRequest } from '../types/handover.types';

export const handoverApi = {
  // Get all handover cases
  getAllCases: async (filters?: {
    status?: string;
    unitId?: string;
    customerId?: string;
  }): Promise<HandoverCase[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.unitId) params.append('unitId', filters.unitId);
    if (filters?.customerId) params.append('customerId', filters.customerId);

    const response = await apiClient.get(`/api/handover/cases?${params.toString()}`);
    return response.data.data;
  },

  // Get single case with events
  getCaseById: async (id: string): Promise<HandoverCaseWithEvents> => {
    const response = await apiClient.get(`/api/handover/cases/${id}`);
    return response.data.data;
  },

  // Complete handover
  completeHandover: async (id: string, data: CompleteHandoverRequest): Promise<HandoverCase> => {
    const response = await apiClient.put(`/api/handover/cases/${id}/complete`, data);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<HandoverStats> => {
    const response = await apiClient.get('/api/handover/stats');
    return response.data.data;
  }
};
