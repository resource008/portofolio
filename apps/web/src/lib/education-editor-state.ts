import { useSyncExternalStore } from "react";

export type EducationEditorMode = "edit" | "create" | null;

let currentMode: EducationEditorMode = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setEducationEditorMode(mode: EducationEditorMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getMode(): EducationEditorMode {
  return currentMode;
}

/** Snapshot used during SSR / hydration where the editor is never open. */
function getServerMode(): EducationEditorMode {
  return null;
}

export function useEducationEditorMode(): EducationEditorMode {
  return useSyncExternalStore(subscribe, getMode, getServerMode);
}

let resetEducationEditor: (() => void) | null = null;

/**
 * Register a handler that exits the education editor (used by the topbar
 * breadcrumb link so it returns to the education list).
 */
export function registerEducationEditorReset(handler: (() => void) | null): void {
  resetEducationEditor = handler;
}

export function requestEducationEditorReset(): void {
  resetEducationEditor?.();
}