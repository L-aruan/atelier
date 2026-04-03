import { create } from 'zustand';
import type { FileInput } from '@mediabox/types';
import type { BatchResult, BatchPhase } from '@/lib/batch-engine';

interface BatchProgress {
  completed: number;
  total: number;
  failed: number;
  currentFile: string;
}

interface AppState {
  pendingFiles: FileInput[];
  setPendingFiles: (files: FileInput[]) => void;
  clearPendingFiles: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  selectedCategory: string;
  setSelectedCategory: (category: string) => void;

  batchPhase: BatchPhase;
  batchPreviewResults: BatchResult[];
  batchResults: BatchResult[];
  batchProgress: BatchProgress;
  setBatchPhase: (phase: BatchPhase) => void;
  setBatchPreviewResults: (results: BatchResult[]) => void;
  setBatchResults: (results: BatchResult[]) => void;
  setBatchProgress: (progress: Partial<BatchProgress>) => void;
  resetBatch: () => void;
}

const defaultBatchProgress: BatchProgress = {
  completed: 0,
  total: 0,
  failed: 0,
  currentFile: '',
};

export const useAppStore = create<AppState>((set) => ({
  pendingFiles: [],
  setPendingFiles: (files) => set({ pendingFiles: files }),
  clearPendingFiles: () => set({ pendingFiles: [] }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  selectedCategory: 'all',
  setSelectedCategory: (category) => set({ selectedCategory: category }),

  batchPhase: 'idle',
  batchPreviewResults: [],
  batchResults: [],
  batchProgress: defaultBatchProgress,
  setBatchPhase: (phase) => set({ batchPhase: phase }),
  setBatchPreviewResults: (results) => set({ batchPreviewResults: results }),
  setBatchResults: (results) => set({ batchResults: results }),
  setBatchProgress: (progress) =>
    set((state) => ({ batchProgress: { ...state.batchProgress, ...progress } })),
  resetBatch: () =>
    set({
      batchPhase: 'idle',
      batchPreviewResults: [],
      batchResults: [],
      batchProgress: defaultBatchProgress,
    }),
}));
