import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { setInboxUnreadCount, useInboxUnreadCount } from "@/lib/inbox-count-store";

/**
 * Live unread-inbox count for the topbar badge. Seeds from a one-off fetch,
 * then stays in sync through the Server-Sent Events stream so the number
 * updates without a manual refresh. Writes straight into the shared
 * inbox-count store, so InboxPage can also decrement it optimistically the
 * moment a message is opened instead of waiting for the next SSE frame.
 */
export function useRealtimeInboxCount(enabled = true): number {
  const query = useQuery({
    queryKey: ["admin", "inbox", "unread-count"],
    queryFn: () => apiGet<{ count: number }>("/admin/inbox/unread-count"),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (typeof query.data?.count === "number") {
      setInboxUnreadCount(query.data.count);
    }
  }, [query.data?.count]);

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource("/api/admin/inbox/stream", { withCredentials: true });

    source.addEventListener("inbox", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { count?: number };
        if (typeof payload.count === "number") setInboxUnreadCount(payload.count);
      } catch {
        // Ignore malformed frames and wait for the next one.
      }
    });

    return () => source.close();
  }, [enabled]);

  return useInboxUnreadCount();
}