import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "@base-ui/react/dialog";
import { EllipsisVerticalIcon, ExclamationCircleIcon, LinkIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { SocialLink } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { logoFromDomain } from "@/lib/campus-logo";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import {
  useRequestLeave,
  useUnsavedChangesGuard,
} from "@/components/admin/unsaved-changes";
import { translate, useLanguage } from "@/lib/language";

interface FormState {
  id?: number;
  url: string;
}

const EMPTY_FORM: FormState = { url: "" };

function logoFromUrl(url: string): string | null {
  const value = url.trim();
  if (!value) return null;
  let host: string | null = null;
  if (!value.includes("://") && value.includes("@")) {
    host = value.split("@").pop()?.trim() ?? null;
  } else {
    try {
      host = new URL(value.startsWith("http") ? value : `https://${value}`).hostname;
    } catch {
      host = null;
    }
  }
  return host ? logoFromDomain(host) : null;
}

export default function SocialLinksPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "social-links"],
    queryFn: () => apiGet<SocialLink[]>("/social-links"),
  });

  const [items, setItems] = useState<SocialLink[]>([]);
  const [editing, setEditing] = useState<FormState | null>(null);
  const [baseline, setBaseline] = useState<FormState | null>(null);
  const requestLeave = useRequestLeave();

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  function openEditor(form: FormState) {
    setEditing(form);
    setBaseline(form);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const saveMutation = useMutation({
    mutationFn: (form: FormState) => {
      const payload = { url: form.url };
      return form.id
        ? apiSend("PUT", `/admin/social-links/${form.id}`, payload)
        : apiSend("POST", "/admin/social-links", payload);
    },
    onSuccess: () => {
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "social-links"] });
      toastManager.add({
        title: translate("Tersimpan"),
        description: translate("Tautan media berhasil disimpan."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: translate("Gagal menyimpan"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/social-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "social-links"] });
      toastManager.add({
        title: translate("Terhapus"),
        description: translate("Tautan media berhasil dihapus."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: translate("Gagal menghapus"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) => apiSend("PATCH", "/admin/social-links/reorder", { ids }),
    onError: (error) => {
      toastManager.add({
        title: translate("Gagal menyimpan urutan"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    reorderMutation.mutate(next.map((item) => item.id));
  }

  const isDirty =
    editing !== null &&
    baseline !== null &&
    JSON.stringify(editing) !== JSON.stringify(baseline);

  useUnsavedChangesGuard({
    isDirty,
    onSave: () => (editing ? saveMutation.mutateAsync({ url: editing.url }) : Promise.resolve()),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{t("Tautan Media")}</h1>
        <p className="text-sm text-muted-foreground">{t("Geser untuk mengatur urutan.")}</p>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat tautan media")}</AlertTitle>
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
        // Empty state tanpa background — logo + judul langsung di tengah.
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PencilIcon />
            </EmptyMedia>
            <EmptyTitle>{t("Belum ada tautan")}</EmptyTitle>
            <EmptyDescription>{t("Tambahkan tautan media sosial kamu.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableRow
                  item={item}
                  key={item.id}
                  onDelete={() => deleteMutation.mutate(item.id)}
                  onEdit={() =>
                    openEditor({
                      id: item.id,
                      url: item.url,
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      {/* FAB — tombol tambah melayang di pojok kanan bawah. */}
      <Button
        aria-label={t("Tambah tautan")}
        className="fixed right-6 bottom-6 z-40 size-16 sm:size-16 rounded-full shadow-lg before:rounded-full"
        onClick={() => openEditor({ ...EMPTY_FORM })}
        size="icon"
        type="button"
      >
        <PlusIcon className="size-7" />
      </Button>

      {editing && (
        <Dialog.Root
          onOpenChange={(open) => {
            if (!open) requestLeave(() => setEditing(null));
          }}
          open
        >
          <Dialog.Portal>
            <Dialog.Backdrop
              className="fixed inset-0 z-50 bg-black/32 backdrop-blur-sm transition-all duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
              forceRender
            />
            <Dialog.Viewport className="fixed inset-0 z-50 grid grid-rows-[1fr_auto_3fr] justify-items-center p-4 max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12">
              <Dialog.Popup
                className="relative row-start-2 flex max-h-full min-h-0 w-full min-w-0 max-w-md origin-center flex-col rounded-2xl border bg-popover not-dark:bg-clip-padding text-popover-foreground opacity-[calc(1-var(--nested-dialogs))] shadow-lg/5 outline-none transition-[scale,opacity,translate] duration-200 ease-in-out will-change-transform before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] data-ending-style:opacity-0 data-starting-style:opacity-0 sm:scale-[calc(1-0.1*var(--nested-dialogs))] sm:data-ending-style:scale-98 sm:data-starting-style:scale-98 dark:before:shadow-[0_-1px_--theme(--color-white/6%)] max-sm:max-w-none max-sm:origin-bottom max-sm:rounded-none max-sm:border-x-0 max-sm:border-t max-sm:border-b-0 max-sm:data-ending-style:translate-y-4 max-sm:data-starting-style:translate-y-4 max-sm:before:hidden max-sm:before:rounded-none"
                data-slot="dialog-popup"
              >
                <Dialog.Close
                  aria-label={t("Tutup")}
                  className="absolute end-2 top-2"
                  render={<Button size="icon" variant="ghost" />}
                >
                  <XMarkIcon />
                </Dialog.Close>
                <div
                  className="flex flex-col gap-2 p-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-panel])]:pb-3 max-sm:pb-4"
                  data-slot="dialog-header"
                >
                  <Dialog.Title className="font-heading font-semibold text-base leading-none">
                    {editing.id ? translate("Ubah Tautan") : translate("Tambah Tautan")}
                  </Dialog.Title>
                </div>
                <form
                  className="flex min-h-0 flex-1 flex-col"
                  onSubmit={(e) => {
                    e.preventDefault();
                    saveMutation.mutate(editing);
                  }}
                >
                  <div
                    className="space-y-4 p-6 in-[[data-slot=dialog-popup]:has([data-slot=dialog-header])]:pt-1"
                    data-slot="dialog-panel"
                  >
                    <SocialLinkFormFields
                      error={saveMutation.error as Error | null}
                      form={editing}
                      onChange={setEditing}
                    />
                  </div>
                  <div
                    className="flex flex-col-reverse gap-2 border-t bg-muted/72 px-6 py-4 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]"
                    data-slot="dialog-footer"
                  >
                    <Button
                      onClick={() => requestLeave(() => setEditing(null))}
                      type="button"
                      variant="ghost"
                    >
                      {t("Batal")}
                    </Button>
                    <Button loading={saveMutation.isPending} type="submit">
                      {t("Simpan")}
                    </Button>
                  </div>
                </form>
              </Dialog.Popup>
            </Dialog.Viewport>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}

function SocialLinkFormFields({
  form,
  error,
  onChange,
}: {
  form: FormState;
  error: Error | null;
  onChange: (form: FormState) => void;
}) {
  const { t } = useLanguage();
  return (
    <>
      <Field>
        <FieldLabel>URL / Email</FieldLabel>
        <div className="flex w-full items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
            {logoFromUrl(form.url) ? (
              <img alt="" className="size-5 object-contain" src={logoFromUrl(form.url) ?? ""} />
            ) : (
              <LinkIcon className="size-4 text-muted-foreground" />
            )}
          </span>
          <Input
            onChange={(e) => onChange({ ...form, url: e.target.value })}
            placeholder={t("https://… atau nama@email.com")}
            required
            value={form.url}
          />
        </div>
      </Field>
      {error && (
        <p className="text-sm text-destructive-foreground">{error.message}</p>
      )}
    </>
  );
}

function SocialLogoPreview({ item }: { item: SocialLink }) {
  const src = logoFromUrl(item.url) ?? item.logo_url;
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="grid size-7 shrink-0 place-items-center rounded-md border bg-muted">
        <LinkIcon className="size-4 text-muted-foreground" />
      </span>
    );
  }

  return (
    <img
      alt=""
      className="size-7 shrink-0 rounded-md bg-white object-contain"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}

function SortableRow({
  item,
  onEdit,
  onDelete,
}: {
  item: SocialLink;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <Card
      className={cn(
        "flex-row items-center gap-3 p-3",
        isDragging && "relative z-10 shadow-md",
      )}
      ref={setNodeRef}
      style={style}
    >
      <Button
        aria-label={t("Geser")}
        className="cursor-grab touch-none text-muted-foreground"
        size="icon-sm"
        variant="ghost"
        {...attributes}
        {...listeners}
      >
        <EllipsisVerticalIcon />
      </Button>

      <SocialLogoPreview item={item} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.platform}</p>
        <p className="truncate text-xs text-muted-foreground">{item.url}</p>
      </div>

      <Button aria-label={t("Ubah")} onClick={onEdit} size="icon-sm" variant="ghost">
        <PencilIcon />
      </Button>
      <Button
        aria-label={t("Hapus")}
        onClick={onDelete}
        size="icon-sm"
        variant="destructive-outline"
      >
        <TrashIcon />
      </Button>
    </Card>
  );
}
