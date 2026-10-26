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

function getServerMode(): EducationEditorMode {
  return null;
}

export function useEducationEditorMode(): EducationEditorMode {
  return useSyncExternalStore(subscribe, getMode, getServerMode);
}

let resetEducationEditor: (() => void) | null = null;

export function registerEducationEditorReset(handler: (() => void) | null): void {
  resetEducationEditor = handler;
}

export function requestEducationEditorReset(): void {
  resetEducationEditor?.();
}