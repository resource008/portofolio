import { useSyncExternalStore } from "react";

/**
 * Status intro situs (layar pembuka Beranda). Hero menunggu `introDone`
 * sebelum memutar entrance-nya, sehingga keduanya tersambung tanpa jeda.
 */
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

/**
 * Urutan entrance setelah intro (detik sejak `introDone`): header lebih dulu,
 * lalu strip announcement, lalu konten hero.
 */
export const ENTRANCE = { header: 0, announce: 0.2, content: 0.35 } as const;

let headerEntered = false;

/** true hanya sekali per pemuatan halaman — header tidak beranimasi ulang saat pindah halaman. */
export function consumeHeaderEntrance(): boolean {
  if (headerEntered) return false;
  headerEntered = true;
  return true;
}
