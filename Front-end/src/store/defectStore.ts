import { create } from 'zustand';
import type { DefectStatus, DefectPriority, DefectCategory } from '../types/defect.types';

interface DefectFilters {
  status: DefectStatus | 'all';
  priority: DefectPriority | 'all';
  category: DefectCategory | 'all';
  searchQuery: string;
}

interface DefectStore {
  filters: DefectFilters;
  setStatusFilter: (status: DefectStatus | 'all') => void;
  setPriorityFilter: (priority: DefectPriority | 'all') => void;
  setCategoryFilter: (category: DefectCategory | 'all') => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const initialFilters: DefectFilters = {
  status: 'all',
  priority: 'all',
  category: 'all',
  searchQuery: '',
};

export const useDefectStore = create<DefectStore>((set) => ({
  filters: initialFilters,

  setStatusFilter: (status) =>
    set((state) => ({
      filters: { ...state.filters, status },
    })),

  setPriorityFilter: (priority) =>
    set((state) => ({
      filters: { ...state.filters, priority },
    })),

  setCategoryFilter: (category) =>
    set((state) => ({
      filters: { ...state.filters, category },
    })),

  setSearchQuery: (searchQuery) =>
    set((state) => ({
      filters: { ...state.filters, searchQuery },
    })),

  resetFilters: () =>
    set({ filters: initialFilters }),
}));
