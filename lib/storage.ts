import type { ImportExportState } from "./mriModel";

export const STORAGE_KEY = "axi-mri-audit-v1";

export function loadFromLocalStorage(): ImportExportState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ImportExportState;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(value: ImportExportState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function clearLocalStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
