import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { EnvelopeOpenIcon, ExclamationCircleIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ContactInboxItem } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn, formatDate } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import {
  Drawer,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import { EmptyEmailIllustration } from "@/components/illustrations/EmptyEmailIllustration";
import { decrementInboxUnread } from "@/lib/inbox-count-store";
import { translate, useLanguage } from "@/lib/language";

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Cuplikan pendek untuk daftar pesan — teks utuh tidak pernah ditampilkan di list. */
function messagePreview(message: string, max = 90): string {
  const compact = message.trim().replace(/\s+/g, " ");
  if (compact.length <= max) return compact;
  const slice = compact.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return `${lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice}…`;
}

export default function InboxPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isCompact = useMediaQuery("max-lg");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Message ids already counted as read this session, so re-opening the same
  // message (before the list refetches) does not decrement the badge twice.
  const readLocally = useRef<Set<number>>(new Set());

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "inbox"],
    queryFn: () => apiGet<ContactInboxItem[]>("/admin/inbox"),
    refetchInterval: 15000,
  });

  const detail = useQuery({
    queryKey: ["admin", "inbox", selectedId],
    queryFn: () => apiGet<ContactInboxItem>(`/admin/inbox/${selectedId}`),
    enabled: selectedId !== null,
  });

  useEffect(() => {
    if (detail.data) {
      queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
    }
  }, [detail.data, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/inbox/${id}`),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "inbox"] });
      toastManager.add({
        title: translate("Pesan dihapus"),
        description: translate("Pesan berhasil dihapus."),
        type: "success",
      });
    },
    onError: (err) => {
      toastManager.add({
        title: translate("Gagal menghapus"),
        description: err instanceof Error ? err.message : translate("Terjadi kesalahan."),
        type: "error",
      });
    },
  });

  const items = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("Kotak Masuk")}</h1>
        <p className="text-sm text-muted-foreground">{t("Pesan masuk dari formulir kontak.")}</p>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat kotak masuk")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {isLoading ? (
              <div className="grid place-items-center p-6">
                <Spinner className="size-6 text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia>
                    <EmptyEmailIllustration className="size-28 opacity-70" />
                  </EmptyMedia>
                  <EmptyTitle>{t("Belum ada pesan")}</EmptyTitle>
                  <EmptyDescription>{t("Pesan dari formulir kontak akan muncul di sini.")}</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="max-h-[calc(100svh-18rem)] divide-y overflow-y-auto">
                {items.map((item) => {
                  const active = selectedId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        className={cn(
                          "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                          active && "bg-accent",
                        )}
                        onClick={() => {
                          if (selectedId === item.id) {
                            setSelectedId(null);
                            return;
                          }
                          if (!item.is_read && !readLocally.current.has(item.id)) {
                            readLocally.current.add(item.id);
                            decrementInboxUnread();
                          }
                          setSelectedId(item.id);
                        }}
                        type="button"
                      >
                        <Avatar className="size-9 shrink-0">
                          <AvatarFallback
                            className={cn(
                              "text-xs",
                              !item.is_read && "bg-primary text-primary-foreground",
                            )}
                          >
                            {initials(item.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={cn("truncate text-sm", !item.is_read && "font-semibold")}
                            >
                              {item.name}
                            </span>
                            {!item.is_read && (
                              <span className="size-2 shrink-0 rounded-full bg-primary" />
                            )}
                            <span className="ms-auto shrink-0 text-muted-foreground text-xs">
                              {formatDate(item.created_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-xs leading-snug text-muted-foreground">
                            {messagePreview(item.message, isCompact ? 60 : 90)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="hidden lg:col-span-3 lg:block">
          <Card className="h-full">
            {selectedId !== null && (
              <Button
                aria-label={t("Tutup")}
                className="absolute top-3 right-3 z-10 text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedId(null)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <XMarkIcon />
              </Button>
            )}
            <CardPanel className="h-full">
              {selectedId === null ? (
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <EnvelopeOpenIcon />
                    </EmptyMedia>
                    <EmptyTitle>{t("Pilih pesan")}</EmptyTitle>
                    <EmptyDescription>{t("Pilih pesan untuk melihat detail.")}</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : detail.isLoading ? (
                <div className="grid place-items-center py-16">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : detail.data ? (
                <div className="flex h-full flex-col gap-4">
                  <MessageDetail item={detail.data} />
                  <div className="flex items-center justify-end">
                    <Button
                      aria-label={t("Hapus pesan")}
                      loading={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(detail.data.id)}
                      size="sm"
                      type="button"
                      variant="destructive-outline"
                    >
                      <TrashIcon />
                      {t("Hapus")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="py-16 text-center text-destructive-foreground text-sm">
                  {t("Gagal memuat pesan.")}
                </p>
              )}
            </CardPanel>
          </Card>
        </div>
      </div>

      {isCompact && (
        <Drawer
          onOpenChange={(open) => !open && setSelectedId(null)}
          open={selectedId !== null}
          position="bottom"
        >
          <DrawerPopup showBar showCloseButton>
            <DrawerHeader>
              <DrawerTitle className="text-base">{t("Pesan")}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel
              className="flex min-h-0 flex-1 flex-col"
              scrollable={false}
            >
              {detail.isLoading ? (
                <div className="grid place-items-center py-16">
                  <Spinner className="size-6 text-muted-foreground" />
                </div>
              ) : detail.data ? (
                <MessageDetail item={detail.data} />
              ) : (
                <p className="py-16 text-center text-destructive-foreground text-sm">
                  {t("Gagal memuat pesan.")}
                </p>
              )}
            </DrawerPanel>
            {detail.data && (
              <DrawerFooter>
                <Button
                  aria-label={t("Hapus pesan")}
                  loading={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate(detail.data.id)}
                  size="sm"
                  type="button"
                  variant="destructive-outline"
                >
                  <TrashIcon />
                  {t("Hapus")}
                </Button>
              </DrawerFooter>
            )}
          </DrawerPopup>
        </Drawer>
      )}
    </div>
  );
}

function MessageDetail({ item }: { item: ContactInboxItem }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-11 shrink-0">
          <AvatarFallback className="text-sm">{initials(item.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-semibold text-lg">{item.name}</h2>
          <a className="text-primary text-sm hover:underline" href={`mailto:${item.email}`}>
            {item.email}
          </a>
          <p className="mt-0.5 text-muted-foreground text-xs">{formatDate(item.created_at)}</p>
        </div>
      </div>

      <p className="min-h-0 flex-1 overflow-y-auto break-words rounded-lg bg-muted p-4 text-sm whitespace-pre-wrap">
        {item.message}
      </p>
    </div>
  );
}
