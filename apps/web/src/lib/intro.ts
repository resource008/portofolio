import { useSyncExternalStore } from "react";

let done = false;
const listeners = new Set<() => void>();

export function markIntroDone(): void {
  if (done) return;
  done = true;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIntroDone(): boolean {
  return useSyncExternalStore(subscribe, () => done, () => true);
}

export const ENTRANCE = { header: 0, announce: 0.2, content: 0.35 } as const;

let headerEntered = false;

export function consumeHeaderEntrance(): boolean {
  if (headerEntered) return false;
  headerEntered = true;
  return true;
}
