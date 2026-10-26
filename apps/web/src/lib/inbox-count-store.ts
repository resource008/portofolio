import { useSyncExternalStore } from "react";

let unreadCount = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getInboxUnreadCount(): number {
  return unreadCount;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Replace the count with the authoritative value from the server. */
export function setInboxUnreadCount(count: number): void {
  if (count === unreadCount) return;
  unreadCount = count;
  emit();
}

/** Optimistic decrement when a message is opened (marked read on the server). */
export function decrementInboxUnread(): void {
  if (unreadCount <= 0) return;
  unreadCount -= 1;
  emit();
}

export function useInboxUnreadCount(): number {
  return useSyncExternalStore(subscribe, getInboxUnreadCount);
}