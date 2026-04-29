import { create } from 'zustand';
import type { OverallStatus } from '../types/handover.types';

interface HandoverFilters {
  status: OverallStatus | 'all';
  searchQuery: string;
}

interface HandoverStore {
  filters: HandoverFilters;
  setStatusFilter: (status: OverallStatus | 'all') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const initialFilters: HandoverFilters = {
  status: 'all',
  searchQuery: '',
};

export const useHandoverStore = create<HandoverStore>((set) => ({
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
