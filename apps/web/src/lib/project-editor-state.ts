import { useSyncExternalStore } from "react";

export type ProjectEditorMode = "create" | "edit" | "draft" | null;
export type ProjectSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

let currentMode: ProjectEditorMode = null;
let currentSaveStatus: ProjectSaveStatus = "idle";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function setProjectEditorMode(mode: ProjectEditorMode): void {
  if (mode === currentMode) return;
  currentMode = mode;
  emit();
}

export function setProjectSaveStatus(status: ProjectSaveStatus): void {
  if (status === currentSaveStatus) return;
  currentSaveStatus = status;
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

function getServerMode(): ProjectEditorMode {
  return null;
}

export function useProjectEditorMode(): ProjectEditorMode {
  return useSyncExternalStore(subscribe, getMode, getServerMode);
}

function getSaveStatus(): ProjectSaveStatus {
  return currentSaveStatus;
}

function getServerSaveStatus(): ProjectSaveStatus {
  return "idle";
}

export function useProjectSaveStatus(): ProjectSaveStatus {
  return useSyncExternalStore(subscribe, getSaveStatus, getServerSaveStatus);
}

let resetProjectEditor: (() => void) | null = null;

export function registerProjectEditorReset(handler: (() => void) | null): void {
  resetProjectEditor = handler;
}

export function requestProjectEditorReset(): void {
  resetProjectEditor?.();
}