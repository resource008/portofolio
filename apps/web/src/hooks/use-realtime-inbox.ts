import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { setInboxUnreadCount, useInboxUnreadCount } from "@/lib/inbox-count-store";

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
      }
    });

    return () => source.close();
  }, [enabled]);

  return useInboxUnreadCount();
}