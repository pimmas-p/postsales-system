import { apiClient } from '../lib/api';
import type {
  OnboardingCase,
  OnboardingStats
} from '../types/onboarding.types';

export const onboardingApi = {
  // Get all onboarding cases
  getAllCases: async (filters?: {
    status?: string;
    unitId?: string;
    customerId?: string;
  }): Promise<OnboardingCase[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.unitId) params.append('unitId', filters.unitId);
    if (filters?.customerId) params.append('customerId', filters.customerId);

    const response = await apiClient.get(`/api/onboarding/cases?${params.toString()}`);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<OnboardingStats> => {
    const response = await apiClient.get('/api/onboarding/stats');
    return response.data.data;
  }
};
