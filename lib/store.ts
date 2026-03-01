"use client";

import { create } from "zustand";
import { clearLocalStorage, loadFromLocalStorage, saveToLocalStorage } from "./storage";
import {
  cloneSeedCategories,
  initialHeader,
  initialRunState,
  type CategoryKey,
  type CategoryScoreItem,
  type ComputedState,
  type HeaderState,
  type ImportExportState,
  type RunState
} from "./mriModel";
import { computeMRI, devCheckMRI, withValidatedScores } from "./mriCalculator";
import type { AuditorResult } from "./mockAuditor";

function clampScore(input: number): number {
  if (!Number.isFinite(input)) return 0;
  return Math.max(0, Math.min(5, Math.round(input)));
}

function emptyComputed(categories: CategoryScoreItem[]): ComputedState {
  return computeMRI(categories);
}

function toExportState(state: MRIStoreState): ImportExportState {
  return {
    schemaVersion: 1,
    header: state.header,
    categories: state.categories,
    learningIntegrationNotes: state.learningIntegrationNotes,
    run: state.run,
    computed: state.computed
  };
}

function parseEvidenceInput(value: string): string[] {
  return value
    .split(/\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

export type MRIStoreState = {
  hydrated: boolean;
  header: HeaderState;
  categories: CategoryScoreItem[];
  learningIntegrationNotes: string;
  run: RunState;
  computed: ComputedState;
  importError?: string;

  hydrateFromStorage: () => void;
  persistNow: () => void;
  setHeaderField: (field: keyof Omit<HeaderState, "constraints">, value: string) => void;
  setConstraintField: (field: keyof HeaderState["constraints"], value: boolean | number) => void;
  setCategoryScore: (categoryKey: CategoryKey, scoreInt0to5: number) => void;
  setCategoryRationale: (categoryKey: CategoryKey, text: string) => void;
  setCategoryEvidence: (categoryKey: CategoryKey, evidenceUrls: string[]) => void;
  setCategoryEvidenceText: (categoryKey: CategoryKey, value: string) => void;
  setLearningIntegrationNotes: (text: string) => void;
  setRun: (partialRun: Partial<RunState>) => void;
  applyAuditorResult: (result: AuditorResult) => void;
  recompute: () => void;
  resetAll: () => void;
  exportState: () => ImportExportState;
  importState: (payload: unknown) => { ok: true } | { ok: false; error: string };
};

const initialCategories = cloneSeedCategories();

devCheckMRI();

export const useMRIStore = create<MRIStoreState>((set, get) => ({
  hydrated: false,
  header: initialHeader(),
  categories: initialCategories,
  learningIntegrationNotes: "",
  run: initialRunState(),
  computed: emptyComputed(initialCategories),
  importError: undefined,

  hydrateFromStorage: () => {
    const stored = loadFromLocalStorage();
    if (!stored) {
      set({ hydrated: true });
      return;
    }

    const safeCategories = withValidatedScores(stored.categories ?? []);
    const computed = computeMRI(safeCategories);

    set({
      hydrated: true,
      header: stored.header ?? initialHeader(),
      categories: safeCategories,
      learningIntegrationNotes: stored.learningIntegrationNotes ?? "",
      run: stored.run ?? initialRunState(),
      computed,
      importError: undefined
    });
  },

  persistNow: () => {
    saveToLocalStorage(toExportState(get()));
  },

  setHeaderField: (field, value) => {
    set((state) => ({
      header: { ...state.header, [field]: value }
    }));
    get().persistNow();
  },

  setConstraintField: (field, value) => {
    set((state) => ({
      header: {
        ...state.header,
        constraints: {
          ...state.header.constraints,
          [field]: field === "timeLimitMinutes" ? Number(value) || 0 : Boolean(value)
        }
      }
    }));
    get().persistNow();
  },

  setCategoryScore: (categoryKey, scoreInt0to5) => {
    set((state) => {
      const categories = state.categories.map((category) =>
        category.key === categoryKey ? { ...category, score0to5: clampScore(scoreInt0to5) } : category
      );
      return { categories, computed: computeMRI(categories) };
    });
    get().persistNow();
  },

  setCategoryRationale: (categoryKey, text) => {
    set((state) => ({
      categories: state.categories.map((category) =>
        category.key === categoryKey ? { ...category, rationale: text } : category
      )
    }));
    get().persistNow();
  },

  setCategoryEvidence: (categoryKey, evidenceUrls) => {
    set((state) => ({
      categories: state.categories.map((category) =>
        category.key === categoryKey ? { ...category, evidenceUrls } : category
      )
    }));
    get().persistNow();
  },

  setCategoryEvidenceText: (categoryKey, value) => {
    get().setCategoryEvidence(categoryKey, parseEvidenceInput(value));
  },

  setLearningIntegrationNotes: (text) => {
    set({ learningIntegrationNotes: text });
    get().persistNow();
  },

  setRun: (partialRun) => {
    set((state) => ({ run: { ...state.run, ...partialRun } }));
    get().persistNow();
  },

  applyAuditorResult: (result) => {
    set((state) => {
      const updates = new Map(result.categoryUpdates.map((update) => [update.key, update]));
      const categories = state.categories.map((category) => {
        const update = updates.get(category.key);
        if (!update) return category;
        return {
          ...category,
          score0to5: clampScore(update.score0to5),
          rationale: update.rationale,
          evidenceUrls: update.evidenceUrls
        };
      });

      return {
        categories,
        run: {
          ...state.run,
          status: "done",
          finishedAt: new Date().toISOString(),
          steps: result.steps,
          blockers: result.blockers,
          progressMessage: "Audit completed"
        },
        computed: computeMRI(categories)
      };
    });
    get().persistNow();
  },

  recompute: () => {
    set((state) => ({ computed: computeMRI(state.categories) }));
    get().persistNow();
  },

  resetAll: () => {
    const categories = cloneSeedCategories();
    clearLocalStorage();
    set({
      header: initialHeader(),
      categories,
      learningIntegrationNotes: "",
      run: initialRunState(),
      computed: computeMRI(categories),
      importError: undefined
    });
  },

  exportState: () => toExportState(get()),

  importState: (payload) => {
    try {
      if (typeof payload !== "object" || payload === null) {
        return { ok: false as const, error: "Invalid JSON payload" };
      }

      const input = payload as Partial<ImportExportState>;
      const safeCategories = withValidatedScores(input.categories ?? []);
      const safeHeader = {
        ...initialHeader(),
        ...(input.header ?? {}),
        constraints: {
          ...initialHeader().constraints,
          ...(input.header?.constraints ?? {})
        }
      };

      const nextState = {
        header: safeHeader,
        categories: safeCategories,
        learningIntegrationNotes: input.learningIntegrationNotes ?? "",
        run: {
          ...initialRunState(),
          ...(input.run ?? {})
        },
        computed: computeMRI(safeCategories),
        importError: undefined
      };

      set(nextState);
      get().persistNow();
      return { ok: true as const };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import state";
      set({ importError: message });
      return { ok: false as const, error: message };
    }
  }
}));
