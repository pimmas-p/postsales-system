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

  // Get single case with events
  getCaseById: async (id: string): Promise<OnboardingCase> => {
    const response = await apiClient.get(`/api/onboarding/cases/${id}`);
    return response.data.data;
  },

  // Create new onboarding case
  createCase: async (data: {
    handoverCaseId?: string;
    unitId: string;
    customerId: string;
    areaSize?: number;
  }): Promise<OnboardingCase> => {
    const response = await apiClient.post('/api/onboarding/cases', data);
    return response.data.data;
  },

  // Update member registration
  registerMember: async (id: string, data: {
    email: string;
    phone: string;
    passwordHash: string;
    areaSize?: number;
    billingCycle?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
    effectiveDate?: string;
  }): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/register`, data);
    return response.data.data;
  },

  // Upload documents
  uploadDocuments: async (id: string, data: {
    idDocumentUrl: string;
    contractDocumentUrl: string;
  }): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/documents`, data);
    return response.data.data;
  },

  // Complete onboarding
  completeOnboarding: async (id: string, data: {
    completedBy: string;
    notes?: string;
  }): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/complete`, data);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<OnboardingStats> => {
    const response = await apiClient.get('/api/onboarding/stats');
    return response.data.data;
  }
};
