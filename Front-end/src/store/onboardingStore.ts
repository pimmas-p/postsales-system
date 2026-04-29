import { create } from 'zustand';
import type { OnboardingOverallStatus } from '../types/onboarding.types';

interface OnboardingFilters {
  status: OnboardingOverallStatus | 'all';
  searchQuery: string;
}

interface OnboardingStore {
  filters: OnboardingFilters;
  setStatusFilter: (status: OnboardingOverallStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const initialFilters: OnboardingFilters = {
  status: 'all',
  searchQuery: '',
};

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  filters: initialFilters,

  setStatusFilter: (status) =>
    set((state) => ({
      filters: { ...state.filters, status },
    })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery },
    })),

  resetFilters: () =>
    set({ filters: initialFilters }),
}));
