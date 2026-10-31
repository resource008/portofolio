import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
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
import { ArrowDownTrayIcon, BoltIcon, ClipboardDocumentListIcon, EllipsisVerticalIcon, ExclamationCircleIcon, PencilIcon, PhotoIcon, PlusIcon, SparklesIcon, TrashIcon } from "@heroicons/react/24/outline";
import type {
  AnnouncementKind,
  AnnouncementType,
  Project,
  ProjectAnnouncement,
  ProjectPostMode,
} from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  ANNOUNCEMENT_KINDS,
  GENERAL_ANNOUNCEMENT_TYPES,
  announcementMeta,
} from "@/lib/announcements";
import { cn } from "@/lib/utils";
import { translate, useLanguage } from "@/lib/language";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardPanel } from "@/components/ui/card";
import { Dialog, DialogFooter, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerFooter, DrawerHeader, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import { SwipeActionButton, SwipeActions } from "@/components/admin/SwipeActions";
import { EmptyBoxIllustration } from "@/components/EmptyBoxIllustration";

interface AnnouncementForm {
  id?: number;
  kind: AnnouncementKind;
  type: AnnouncementType;
  text: string;
  is_active: boolean;
  post_mode: ProjectPostMode;
  project_ids: number[];
}

const EMPTY: AnnouncementForm = {
  kind: "general",
  type: "info",
  text: "",
  is_active: true,
  post_mode: "auto",
  project_ids: [],
};

function toForm(item: ProjectAnnouncement): AnnouncementForm {
  return {
    id: item.id,
    kind: item.kind,
    type: item.type,
    text: item.text ?? "",
    is_active: item.is_active,
    post_mode: item.post_mode,
    project_ids: item.project_ids ?? [],
  };
}

export default function AnnouncementManager({ className }: { className?: string }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "project-announcements"],
    queryFn: () =>
      apiGet<{ announcements: ProjectAnnouncement[] }>("/admin/project-announcements"),
  });
  const { data: projectsData } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => apiGet<Project[]>("/admin/projects"),
  });

  const [editing, setEditing] = useState<AnnouncementForm | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProjectAnnouncement | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const isMobile = useMediaQuery("max-lg");
  const isLargeScreen = useMediaQuery("lg");

  useEffect(() => {
    if (!isMobile) setReorderMode(false);
  }, [isMobile]);

  const items = data?.announcements ?? [];
  const projects = projectsData ?? [];

  // "Otomatis" hanya boleh dipilih untuk satu announcement (project) saja.
  const autoTakenByOther = items.some(
    (item) => item.id !== editing?.id && item.kind === "project" && item.post_mode === "auto",
  );

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "project-announcements"] });
    queryClient.invalidateQueries({ queryKey: ["project-announcements"] });
  }

  function buildPayload(form: AnnouncementForm) {
    return {
      kind: form.kind,
      type: form.kind === "project" ? "new_post" : form.type,
      text: form.text || null,
      is_active: form.is_active,
      post_mode: form.post_mode,
      project_ids: form.kind === "project" ? form.project_ids : [],
    };
  }

  const saveMutation = useMutation({
    mutationFn: (form: AnnouncementForm) => {
      const payload = buildPayload(form);
      return form.id
        ? apiSend("PUT", `/admin/project-announcements/${form.id}`, payload)
        : apiSend("POST", "/admin/project-announcements", payload);
    },
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toastManager.add({ title: translate("Tersimpan"), description: translate("Pengumuman disimpan."), type: "success" });
    },
    onError: (err) => {
      toastManager.add({ title: translate("Gagal menyimpan"), description: (err as Error).message, type: "error" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ item, next }: { item: ProjectAnnouncement; next: boolean }) => {
      const form = toForm(item);
      return apiSend("PUT", `/admin/project-announcements/${form.id}`, {
        ...buildPayload(form),
        is_active: next,
      });
    },
    onSuccess: (_data, variables) => {
      invalidate();
      toastManager.add({
        title: variables.next ? translate("Ditampilkan") : translate("Disembunyikan"),
        description: variables.next
          ? translate("Pengumuman ditampilkan di halaman publik.")
          : translate("Pengumuman disembunyikan dari halaman publik."),
        type: "success",
      });
    },
    onError: (err) => {
      toastManager.add({
        title: translate("Gagal memperbarui"),
        description: (err as Error).message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/project-announcements/${id}`),
    onSuccess: () => {
      setPendingDelete(null);
      invalidate();
      toastManager.add({ title: translate("Terhapus"), description: translate("Pengumuman dihapus."), type: "success" });
    },
    onError: (err) => {
      toastManager.add({ title: translate("Gagal menghapus"), description: (err as Error).message, type: "error" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (ids: number[]) =>
      apiSend("PUT", "/admin/project-announcements/reorder", { ids }),
    onSuccess: () => invalidate(),
    onError: (err) => {
      toastManager.add({ title: translate("Gagal menyimpan urutan"), description: (err as Error).message, type: "error" });
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((item) => item.id === active.id);
    const to = items.findIndex((item) => item.id === over.id);
    if (from === -1 || to === -1) return;
    reorderMutation.mutate(arrayMove(items, from, to).map((item) => item.id));
  }

  function toggleActive(item: ProjectAnnouncement, next: boolean) {
    toggleMutation.mutate({ item, next });
  }

  function openCreate() {
    const autoTaken = items.some(
      (item) => item.kind === "project" && item.post_mode === "auto",
    );
    setEditing({ ...EMPTY, post_mode: autoTaken ? "manual" : "auto" });
  }

  function openEdit(item: ProjectAnnouncement) {
    setEditing(toForm(item));
  }

  const formTitle = editing?.id ? t("Ubah Pengumuman") : t("Tambah Pengumuman");
  const formBody = editing ? (
    <AnnouncementFormPanel
      autoTakenByOther={autoTakenByOther}
      form={editing}
      onChange={setEditing}
      projects={projects}
    />
  ) : null;
  const formActions = (
    <>
      <Button
        loading={saveMutation.isPending}
        onClick={() => editing && saveMutation.mutate(editing)}
        type="button"
      >
        {!saveMutation.isPending && <ArrowDownTrayIcon />}
        {t("Simpan")}
      </Button>
    </>
  );

  const listContent = () => (
    <>
      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat pengumuman")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid place-items-center rounded-xl border bg-card py-6 shadow-xs/5">
          <Spinner className="size-5 text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardPanel>
            <Empty className="py-8">
              <EmptyHeader>
                <EmptyMedia>
                  <EmptyBoxIllustration className="size-16 opacity-60" />
                </EmptyMedia>
                <EmptyTitle className="text-base">{t("Belum ada pengumuman")}</EmptyTitle>
                <EmptyDescription>
                  {t("Buat pengumuman umum atau promosikan postingan proyek.")}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </CardPanel>
        </Card>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {items.map((item) => (
                <SortableAnnouncementItem
                  isMobile={isMobile}
                  item={item}
                  key={item.id}
                  onDelete={() => setPendingDelete(item)}
                  onEdit={() => openEdit(item)}
                  onToggleActive={(next) => toggleActive(item, next)}
                  projectTitle={(id) => projects.find((project) => project.id === id)?.title ?? ""}
                  reorderMode={reorderMode}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </>
  );

  return (
    <>
      <div className={cn("space-y-3 pb-24", className)}>
        {isMobile && items.length > 1 && (
          <div className="flex justify-end">
            <Button
              aria-pressed={reorderMode}
              onClick={() => setReorderMode((mode) => !mode)}
              size="sm"
              type="button"
              variant={reorderMode ? "default" : "secondary"}
            >
              {reorderMode ? <ClipboardDocumentListIcon className="size-4" /> : <EllipsisVerticalIcon className="size-4" />}
              {reorderMode ? t("Selesai") : t("Ubah urutan")}
            </Button>
          </div>
        )}
        {listContent()}
      </div>

      <Button
        aria-label={t("Tambah Pengumuman")}
        className="fixed right-6 bottom-6 z-40 size-16 rounded-full shadow-lg before:rounded-full sm:size-16"
        onClick={openCreate}
        size="icon"
        type="button"
      >
        <PlusIcon className="size-7" />
      </Button>

      {isLargeScreen ? (
        <Dialog
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          open={editing !== null}
        >
          <DialogPopup className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{formTitle}</DialogTitle>
            </DialogHeader>
            <DialogPanel>{formBody}</DialogPanel>
            <DialogFooter>{formActions}</DialogFooter>
          </DialogPopup>
        </Dialog>
      ) : (
        <Drawer
          onOpenChange={(next) => {
            if (!next) setEditing(null);
          }}
          open={editing !== null}
          position="bottom"
        >
          <DrawerPopup className="w-full max-w-2xl justify-self-center" showCloseButton>
            <DrawerHeader>
              <DrawerTitle>{formTitle}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel className="pb-8" scrollFade={false}>
              {formBody}
            </DrawerPanel>
            <DrawerFooter>{formActions}</DrawerFooter>
          </DrawerPopup>
        </Drawer>
      )}

      <ConfirmDialog
        description={pendingDelete ? t("Pengumuman ini akan dihapus permanen.") : undefined}
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        open={pendingDelete !== null}
        title={t("Hapus pengumuman?")}
      />
    </>
  );
}

const ANNOUNCEMENT_FORM_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const ANNOUNCEMENT_FORM_ITEM: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

const ANNOUNCEMENT_TAB_VARIANTS: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.18, ease: [0.22, 1, 0.36, 1] },
  },
};

function AnnouncementFormPanel({
  autoTakenByOther,
  form,
  projects,
  onChange,
}: {
  autoTakenByOther: boolean;
  form: AnnouncementForm;
  projects: Project[];
  onChange: (form: AnnouncementForm) => void;
}) {
  const { t } = useLanguage();
  const publishedProjects = projects.filter((project) => project.is_published);
  // Urutan sama dengan API: created_at DESC, id DESC.
  const autoPreview = [...publishedProjects].sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime || b.id - a.id;
  });

  return (
    <motion.form
      animate="show"
      className="flex flex-col gap-5"
      initial="hidden"
      onSubmit={(e) => {
        // Cegah submit bawaan (mis. Enter di field) agar halaman tidak reload.
        e.preventDefault();
      }}
      variants={ANNOUNCEMENT_FORM_VARIANTS}
    >
      <motion.div variants={ANNOUNCEMENT_FORM_ITEM}>
        <div className="relative grid grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1">
          {ANNOUNCEMENT_KINDS.map((kind) => {
            const selected = form.kind === kind.value;
            return (
              <button
                className={cn(
                  "relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                key={kind.value}
                onClick={() =>
                  onChange({
                    ...form,
                    kind: kind.value,
                    post_mode:
                      kind.value === "project" && autoTakenByOther
                        ? "manual"
                        : form.post_mode,
                    type: kind.value === "project" ? "new_post" : "info",
                    text: kind.value === "project" ? "" : form.text,
                  })
                }
                type="button"
              >
                {selected && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-lg bg-background shadow-xs ring-1 ring-border"
                    layoutId="announcement-kind-morph"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <kind.icon
                  className={cn(
                    "relative z-10 size-4",
                    selected &&
                      (kind.value === "project"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-blue-600 dark:text-blue-400"),
                  )}
                />
                <span className="relative z-10 font-medium">{t(kind.label)}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      <motion.div
        layout
        className="relative"
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {form.kind === "general" ? (
          <motion.div
            animate="animate"
            className="space-y-3"
            exit="exit"
            initial="initial"
            key="general"
            variants={ANNOUNCEMENT_TAB_VARIANTS}
          >
          <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1">
            {GENERAL_ANNOUNCEMENT_TYPES.map((type) => {
              const selected = form.type === type.value;
              return (
                <button
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    selected
                      ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  key={type.value}
                  onClick={() => onChange({ ...form, type: type.value })}
                  type="button"
                >
                  <type.icon className={cn("size-4", type.accent)} />
                  {t(type.label)}
                </button>
              );
            })}
          </div>

          <Field>
            <FieldLabel>{t("Teks")}</FieldLabel>
            <Textarea
              className="[&_textarea]:min-h-20 [&_textarea]:resize-none"
              onChange={(e) => onChange({ ...form, text: e.target.value })}
              placeholder={t("mis. Pembaruan fitur baru…")}
              value={form.text}
            />
          </Field>
        </motion.div>
      ) : (
        <motion.div
          animate="animate"
          className="space-y-3"
          exit="exit"
          initial="initial"
          key="project"
          variants={ANNOUNCEMENT_TAB_VARIANTS}
        >
          <div className="grid grid-cols-2 gap-1 rounded-xl border bg-muted/50 p-1">
            <button
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                form.post_mode === "auto"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
                autoTakenByOther && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
              )}
              disabled={autoTakenByOther}
              onClick={() => onChange({ ...form, post_mode: "auto" })}
              title={autoTakenByOther ? t("Otomatis sudah dipakai pengumuman lain") : undefined}
              type="button"
            >
              <BoltIcon className="size-4" />
              {t("Otomatis")}
            </button>
            <button
              className={cn(
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                form.post_mode === "manual"
                  ? "bg-background text-foreground shadow-xs ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => onChange({ ...form, post_mode: "manual" })}
              type="button"
            >
              <ClipboardDocumentListIcon className="size-4" />
              {t("Pilih sendiri")}
            </button>
          </div>

          {autoTakenByOther && (
            <Alert className="rounded-lg px-3 py-2.5" variant="warning">
              <BoltIcon />
              <AlertDescription>
                {t("Otomatis sudah dipakai pengumuman lain — hanya satu pengumuman yang bisa menggunakan mode Otomatis. Pilih postingan secara manual.")}
              </AlertDescription>
            </Alert>
          )}

          {form.post_mode === "auto" ? (
            <div className="space-y-2">
              <Alert className="rounded-lg px-3 py-2.5" variant="info">
                <BoltIcon />
                <AlertDescription>
                  {publishedProjects.length === 0
                    ? t("Belum ada postingan dipublikasikan.")
                    : t("Otomatis menampilkan seluruh postingan yang dipublikasikan ({count}).", { count: autoPreview.length })}
                </AlertDescription>
              </Alert>
              {autoPreview.length > 0 && (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-background p-1.5">
                  {autoPreview.map((project) => (
                    <div className="flex items-center gap-3 rounded-md p-1.5" key={project.id}>
                      <BoltIcon className="size-4 shrink-0 text-muted-foreground" />
                      <ProjectRowContent project={project} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-foreground text-sm">
                {t("Pilih postingan ({count})", { count: form.project_ids.length })}
              </p>
              {publishedProjects.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("Belum ada postingan dipublikasikan.")}</p>
              ) : (
                <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border bg-background p-1.5">
                  {publishedProjects.map((project) => {
                    const checked = form.project_ids.includes(project.id);
                    return (
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md p-1.5 transition-colors hover:bg-accent",
                          checked && "bg-accent/60",
                        )}
                        key={project.id}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) =>
                            onChange({
                              ...form,
                              project_ids: next
                                ? [...form.project_ids, project.id]
                                : form.project_ids.filter((id) => id !== project.id),
                            })
                          }
                        />
                        <ProjectRowContent project={project} />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
      </AnimatePresence>
      </motion.div>

      <motion.label
        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-background px-3.5 py-3"
        variants={ANNOUNCEMENT_FORM_ITEM}
      >
        <span className="font-medium text-sm">{t("Tampilkan di publik")}</span>
        <Switch
          checked={form.is_active}
          onCheckedChange={(next) => onChange({ ...form, is_active: next })}
        />
      </motion.label>
    </motion.form>
  );
}

function ProjectRowContent({ project }: { project: Project }) {
  const thumb = project.media[0]?.type === "image" ? project.media[0].url : undefined;
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
        {thumb ? (
          <img
            alt=""
            className="size-full object-cover"
            decoding="async"
            loading="lazy"
            src={thumb}
          />
        ) : (
          <PhotoIcon className="size-4 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-sm">{project.title}</span>
        <span className="block truncate text-muted-foreground text-xs">{project.category}</span>
      </span>
    </>
  );
}

function SortableAnnouncementItem({
  item,
  onEdit,
  onDelete,
  onToggleActive,
  projectTitle,
  isMobile,
  reorderMode,
}: {
  item: ProjectAnnouncement;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (next: boolean) => void;
  projectTitle: (id: number) => string;
  isMobile: boolean;
  reorderMode: boolean;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const meta = announcementMeta(item.type);
  const isProject = item.kind === "project";
  const reordering = isMobile && reorderMode;

  let detail: string;
  let detailTitle: string;
  if (isProject) {
    if (item.post_mode === "auto") {
      detail = t("Semua postingan");
      detailTitle = t("Menampilkan seluruh postingan proyek yang dipublikasikan.");
    } else {
      const titles = (item.project_ids ?? []).map(projectTitle).filter(Boolean);
      const shown = titles.slice(0, 2);
      detail = shown.length > 0 ? shown.join(" · ") : t("Belum ada postingan dipilih");
      detailTitle =
        titles.length > 2 ? t("{shown} (+{count} lainnya)", { shown: shown.join(" · "), count: titles.length - 2 }) : detail;
    }
  } else {
    detail = item.text?.trim() || t("Tanpa teks");
    detailTitle = detail;
  }

  return (
    <li
      className={cn(
        "group overflow-hidden rounded-xl border bg-card transition-colors",
        isDragging && "relative z-10 border bg-card shadow-md",
        !item.is_active && "opacity-60",
      )}
      ref={setNodeRef}
      style={style}
    >
      <div className={cn("flex items-center gap-3", !(isMobile && !reorderMode) && "p-3")}>
        {(!isMobile || reorderMode) && (
          <Button
            aria-label={t("Geser")}
            className={cn(
              "-ms-1.5 shrink-0 cursor-grab touch-none text-muted-foreground transition-opacity",
              reordering ? "opacity-100" : "opacity-50 group-hover:opacity-100",
            )}
            size="icon-sm"
            type="button"
            variant="ghost"
            {...attributes}
            {...listeners}
          >
            <EllipsisVerticalIcon />
          </Button>
        )}

        <SwipeActions
          actions={
            <>
              <SwipeActionButton
                aria-label={t("Ubah")}
                className="bg-accent text-foreground"
                onClick={onEdit}
              >
                <PencilIcon className="size-4" />
              </SwipeActionButton>
              <SwipeActionButton
                aria-label={t("Hapus")}
                className="bg-destructive text-white"
                onClick={onDelete}
              >
                <TrashIcon className="size-4" />
              </SwipeActionButton>
            </>
          }
          className="min-w-0 flex-1"
          enabled={isMobile && !reorderMode}
        >
          <div className={cn("flex min-w-0 items-center gap-3", isMobile && !reorderMode && "p-3")}>
            <span
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-xl border",
                isProject
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : meta.accent,
              )}
            >
              {isProject ? <SparklesIcon className="size-6" /> : <meta.icon className="size-6" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "font-medium text-xs",
                    isProject ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {isProject ? t("Proyek") : t("Umum")}
                </span>
                <span className="text-muted-foreground/40 text-xs">•</span>
                <span className={cn("truncate font-medium text-xs", meta.accent)}>
                  {t(meta.label)}
                </span>
              </div>
              <p
                className="mt-0.5 line-clamp-2 text-foreground/90 text-sm"
                title={detailTitle}
              >
                {detail}
              </p>
            </div>

            {isMobile && !reorderMode && (
              <Switch
                aria-label={item.is_active ? t("Sembunyikan pengumuman") : t("Tampilkan pengumuman")}
                checked={item.is_active}
                className="shrink-0"
                onCheckedChange={(next) => onToggleActive(next)}
                title={item.is_active ? t("Sembunyikan") : t("Tampilkan")}
              />
            )}
          </div>
        </SwipeActions>

        {!isMobile && (
          <div className="ms-auto flex shrink-0 items-center gap-1.5">
            <Switch
              aria-label={item.is_active ? t("Sembunyikan pengumuman") : t("Tampilkan pengumuman")}
              checked={item.is_active}
              onCheckedChange={(next) => onToggleActive(next)}
              title={item.is_active ? t("Sembunyikan") : t("Tampilkan")}
            />
            <Button
              aria-label={t("Ubah")}
              onClick={onEdit}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <PencilIcon />
            </Button>
            <Button
              aria-label={t("Hapus")}
              onClick={onDelete}
              size="icon-sm"
              type="button"
              variant="destructive-outline"
            >
              <TrashIcon />
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
