import { apiClient } from '../lib/api';
import type {
  OnboardingCase,
  OnboardingCaseWithEvents,
  OnboardingStats,
  CreateOnboardingRequest,
  RegisterMemberRequest,
  UploadDocumentsRequest,
  CompleteOnboardingRequest
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
  getCaseById: async (id: string): Promise<OnboardingCaseWithEvents> => {
    const response = await apiClient.get(`/api/onboarding/cases/${id}`);
    return response.data.data;
  },

  // Create new onboarding case (manual start)
  createCase: async (data: CreateOnboardingRequest): Promise<OnboardingCase> => {
    const response = await apiClient.post('/api/onboarding/cases', data);
    return response.data.data;
  },

  // Register member
  registerMember: async (id: string, data: RegisterMemberRequest): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/register`, data);
    return response.data.data;
  },

  // Upload documents
  uploadDocuments: async (id: string, data: UploadDocumentsRequest): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/documents`, data);
    return response.data.data;
  },

  // Complete onboarding
  completeOnboarding: async (id: string, data: CompleteOnboardingRequest): Promise<OnboardingCase> => {
    const response = await apiClient.put(`/api/onboarding/cases/${id}/complete`, data);
    return response.data.data;
  },

  // Get statistics
  getStats: async (): Promise<OnboardingStats> => {
    const response = await apiClient.get('/api/onboarding/stats');
    return response.data.data;
  }
};
