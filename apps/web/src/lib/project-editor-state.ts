import { useSyncExternalStore } from "react";

export type ProjectEditorMode = "create" | "edit" | "draft" | null;

let currentMode: ProjectEditorMode = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setProjectEditorMode(mode: ProjectEditorMode): void {
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

function getMode(): ProjectEditorMode {
  return currentMode;
}

/** Snapshot used during SSR / hydration where the editor is never open. */
function getServerMode(): ProjectEditorMode {
  return null;
}

export function useProjectEditorMode(): ProjectEditorMode {
  return useSyncExternalStore(subscribe, getMode, getServerMode);
}

let resetProjectEditor: (() => void) | null = null;

/**
 * Register a handler that exits the project editor (used by the topbar
 * breadcrumb link so it returns to the project list).
 */
export function registerProjectEditorReset(handler: (() => void) | null): void {
  resetProjectEditor = handler;
}

export function requestProjectEditorReset(): void {
  resetProjectEditor?.();
}