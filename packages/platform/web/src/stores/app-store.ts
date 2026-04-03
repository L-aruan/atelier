import { create } from 'zustand';
import type { FileInput } from '@mediabox/types';

interface AppState {
  pendingFiles: FileInput[];
  setPendingFiles: (files: FileInput[]) => void;
  clearPendingFiles: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  pendingFiles: [],
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPendingFiles: () => set({ pendingFiles: [] }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
