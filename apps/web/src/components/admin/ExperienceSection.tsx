import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseIcon, BuildingOffice2Icon, CalendarDaysIcon, ChevronDownIcon, ExclamationCircleIcon, PencilIcon, PhotoIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { Experience, ExperienceContent } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import MediaPreviewDialog from "@/components/admin/MediaPreviewDialog";
import { SwipeActionButton, SwipeActions } from "@/components/admin/SwipeActions";
import { HScroll } from "@/components/admin/HScroll";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { EmptyBoxIllustration } from "@/components/EmptyBoxIllustration";
import { TechLogoPreview } from "@/components/admin/experience-fields";

function PhotoThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="grid size-20 place-items-center bg-muted text-muted-foreground">
        <PhotoIcon className="size-6" />
      </span>
    );
  }

  return (
    <img
      alt=""
      className="h-20 w-auto object-cover transition-transform hover:scale-105"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

export default function ExperienceSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "experiences"],
    queryFn: () => apiGet<ExperienceContent>("/admin/experiences"),
  });

  const [pendingDelete, setPendingDelete] = useState<Experience | null>(null);
  const [preview, setPreview] = useState<{ photos: string[]; index: number } | null>(null);
  const canSwipe = useMediaQuery("max-lg");
  const [expandedIds, setExpandedIds] = useState<Experience["id"][]>([]);
  const toggleExpanded = (id: Experience["id"]) =>
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  const hasDetail = (item: Experience) =>
    Boolean(item.description) || item.skills.length > 0 || item.photos.length > 0;

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/experiences/${id}`),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "experiences"] });
      toastManager.add({
        title: t("Terhapus"),
        description: t("Data pengalaman berhasil dihapus."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: t("Gagal menghapus"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat data pengalaman")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card className="p-2">
          <div className="grid place-items-center p-6">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <EmptyBoxIllustration className="size-28 opacity-70" />
            </EmptyMedia>
            <EmptyTitle>{t("Belum ada pengalaman")}</EmptyTitle>
            <EmptyDescription>{t("Tambahkan pengalaman kerja atau organisasi.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card className="overflow-hidden" key={item.id}>
                <SwipeActions
                  actions={
                    <>
                      <SwipeActionButton
                        aria-label={t("Ubah")}
                        className="bg-accent text-foreground"
                        onClick={() => navigate(`/admin/content/experience/${item.id}/edit`)}
                      >
                        <PencilIcon className="size-4" />
                      </SwipeActionButton>
                      <SwipeActionButton
                        aria-label={t("Hapus")}
                        className="bg-destructive text-white"
                        onClick={() => setPendingDelete(item)}
                      >
                        <TrashIcon className="size-4" />
                      </SwipeActionButton>
                    </>
                  }
                  enabled={canSwipe}
                >
                <Accordion
                  onValueChange={() => toggleExpanded(item.id)}
                  value={expandedIds.includes(item.id) ? ["open"] : []}
                >
                <AccordionItem className="border-b-0" value="open">
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                  <AccordionTrigger
                    className="min-w-0 items-center gap-3 py-0 font-normal disabled:opacity-100"
                    hideIndicator
                    disabled={!hasDetail(item)}
                  >
                    {item.logo_url ? (
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
                        <img
                          alt=""
                          className="size-6 object-contain"
                          src={item.logo_url}
                        />
                      </span>
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted">
                        <BriefcaseIcon className="size-5 text-muted-foreground" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-sm">{item.position}</span>
                        {!item.is_published && (
                          <Badge className="shrink-0" variant="warning">{t("Draf")}</Badge>
                        )}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                        <span className="flex min-w-0 items-center gap-1">
                          <BuildingOffice2Icon className="size-3.5 shrink-0" />
                          <span className="truncate">{item.company_name}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="size-3.5 shrink-0" />
                          {item.range_date}
                          {item.is_current ? ` - ${t("Sekarang")}` : ""}
                        </span>
                      </span>
                    </span>
                  </AccordionTrigger>
                  </div>

                  {!canSwipe && (
                    <>
                      <Button
                        aria-label={t("Ubah")}
                        onClick={() => navigate(`/admin/content/experience/${item.id}/edit`)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={t("Hapus")}
                        onClick={() => setPendingDelete(item)}
                        size="icon-sm"
                        variant="destructive-outline"
                      >
                        <TrashIcon />
                      </Button>
                    </>
                  )}

                  {hasDetail(item) && (
                    <Button
                      aria-expanded={expandedIds.includes(item.id)}
                      aria-label={t("Tampilkan detail")}
                      onClick={() => toggleExpanded(item.id)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronDownIcon
                        className={cn(
                          "transition-transform duration-200",
                          expandedIds.includes(item.id) && "rotate-180",
                        )}
                      />
                    </Button>
                  )}
                </div>

                {hasDetail(item) && (
                  <AccordionPanel className="space-y-2 px-3 pb-3">
                    {item.description && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="font-medium text-muted-foreground text-xs">{t("Deskripsi")}</p>
                        <p className="mt-1 whitespace-pre-line text-muted-foreground text-xs">
                          {item.description}
                        </p>
                      </div>
                    )}
                    {item.skills.length > 0 && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="font-medium text-muted-foreground text-xs">Tech Stack</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.skills.map((skill) => (
                            <span
                              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground"
                              key={skill}
                            >
                              <TechLogoPreview name={skill} size="sm" />
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.photos.length > 0 && (
                      <div className="rounded-lg bg-muted/40 py-3">
                        <p className="px-3 font-medium text-muted-foreground text-xs">
                          {t("Foto ({count})", { count: item.photos.length })}
                        </p>
                        <HScroll className="mt-2 gap-2 px-3">
                          {item.photos.map((photo, photoIndex) => (
                            <button
                              className="cursor-zoom-in flex-shrink-0 overflow-hidden rounded-md border"
                              key={photo}
                              onClick={() => setPreview({ photos: item.photos, index: photoIndex })}
                              type="button"
                            >
                              <PhotoThumb src={photo} />
                            </button>
                          ))}
                        </HScroll>
                      </div>
                    )}
                  </AccordionPanel>
                )}
                </AccordionItem>
                </Accordion>
                </SwipeActions>
            </Card>
          ))}
        </div>
      )}
      <Button
        aria-label={t("Tambah pengalaman")}
        className="fixed right-6 bottom-6 z-40 size-16 sm:size-16 rounded-full shadow-lg before:rounded-full"
        onClick={() => navigate("/admin/content/experience/new")}
        size="icon"
        type="button"
      >
        <PlusIcon className="size-7" />
      </Button>

      <ConfirmDialog
        description={
          pendingDelete
            ? t('Data pengalaman "{position}" di {company} akan dihapus permanen.', { position: pendingDelete.position, company: pendingDelete.company_name })
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        open={pendingDelete !== null}
        title={t("Hapus pengalaman?")}
      />

      <MediaPreviewDialog
        onClose={() => setPreview(null)}
        open={preview !== null}
        photos={preview?.photos}
        index={preview?.index ?? 0}
        onIndexChange={(index) => setPreview({ photos: preview?.photos ?? [], index })}
        title={t("Pratinjau Foto")}
        url={preview ? (preview.photos[preview.index] ?? null) : null}
      />
    </div>
  );
}