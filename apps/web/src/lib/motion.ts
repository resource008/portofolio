import { useSyncExternalStore } from "react";

const STORAGE_KEY = "motion-enabled";
const listeners = new Set<() => void>();

function readStoredMotion(): boolean {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === null ? true : value === "true";
}

let current: boolean = typeof window === "undefined" ? true : readStoredMotion();

export function getMotionEnabled(): boolean {
  return current;
}

export function setMotionEnabled(enabled: boolean): void {
  current = enabled;
  localStorage.setItem(STORAGE_KEY, String(enabled));
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMotionEnabled(): {
  motionEnabled: boolean;
  setMotionEnabled: (enabled: boolean) => void;
} {
  const motionEnabled = useSyncExternalStore(subscribe, getMotionEnabled, () => true);
  return { motionEnabled, setMotionEnabled };
}
