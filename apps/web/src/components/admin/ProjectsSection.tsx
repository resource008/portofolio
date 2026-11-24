import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { ArrowDownTrayIcon, ArrowLeftIcon, ArrowUpTrayIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, Bars3BottomLeftIcon, Bars3BottomRightIcon, Bars3Icon, BoldIcon, CalendarDaysIcon, CalendarIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ClipboardDocumentListIcon, DocumentArrowDownIcon, EllipsisHorizontalIcon, EllipsisVerticalIcon, ExclamationCircleIcon, H1Icon, ItalicIcon, LinkIcon, ListBulletIcon, NumberedListIcon, PencilIcon, PhotoIcon, PlusIcon, RectangleStackIcon, Square3Stack3DIcon, Squares2X2Icon, TagIcon, TrashIcon, UnderlineIcon, VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type {
  Project,
  ProjectBlock,
  ProjectBlockAlign,
  ProjectBlockFit,
  ProjectBlockType,
  ProjectDetail,
  ProjectGalleryBlock,
  ProjectGalleryItem,
  ProjectLinkBlock,
  ProjectMedia,
  ProjectTextBlock,
} from "@portofolio/shared";
import { formatUploadSize, UPLOAD_LIMITS, validateUpload } from "@portofolio/shared";
import { apiGet, apiSend, apiUpload } from "@/lib/api";
import {
  registerProjectEditorReset,
  setProjectEditorMode,
  setProjectSaveStatus,
} from "@/lib/project-editor-state";
import { logoFromDomain } from "@/lib/campus-logo";
import { resolveTechLogo, TECH_OPTIONS } from "@/lib/tech-logo";
import {
  segmentedControlItemVariants,
  segmentedControlRootClassName,
} from "@/lib/segmented-control";
import { cn } from "@/lib/utils";
import { translate, useLanguage } from "@/lib/language";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Dialog, DialogBackdrop, DialogPortal } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Menu,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
} from "@/components/ui/autocomplete";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Toggle } from "@/components/ui/toggle";
import { toastManager } from "@/components/ui/toast";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import {
  useRequestLeave,
  useUnsavedChangesGuard,
} from "@/components/admin/unsaved-changes";
import { SwipeActionButton, SwipeActions } from "@/components/admin/SwipeActions";
import { EmptyBoxIllustration } from "@/components/EmptyBoxIllustration";
import { MonthYearRange } from "@/components/admin/history-fields";

interface ProjectForm {
  id?: number;
  category: string;
  date_range: string;
  media: ProjectMedia[];
  tech_stacks: string[];
  is_published: boolean;
  content: ProjectBlock[];
}

interface ProjectPayload {
  title: string;
  category: string;
  date_range: string | null;
  media: ProjectMedia[];
  tech_stacks: string[];
  is_published: boolean;
  content: ProjectBlock[];
}

const EMPTY: ProjectForm = {
  category: "",
  date_range: "",
  media: [],
  tech_stacks: [],
  is_published: false,
  content: [],
};

function toForm(item: Project | ProjectDetail): ProjectForm {
  return {
    id: item.id,
    category: item.category,
    date_range: item.date_range ?? "",
    media: item.media ?? [],
    tech_stacks: item.tech_stacks ?? [],
    is_published: item.is_published,
    content: "content" in item ? (item.content ?? []) : [],
  };
}

const MONTH_ABBR: Record<string, string> = {
  Januari: "Jan",
  Februari: "Feb",
  Maret: "Mar",
  April: "Apr",
  Mei: "Mei",
  Juni: "Jun",
  Juli: "Jul",
  Agustus: "Agu",
  September: "Sep",
  Oktober: "Okt",
  November: "Nov",
  Desember: "Des",
};

function abbreviatePeriod(value: string): string {
  return value.replace(/[A-Za-z]+/g, (month) => MONTH_ABBR[month] ?? month);
}

function isOngoingPeriod(value: string): boolean {
  return /(^|[-–])\s*(now|sekarang)\s*$/i.test(value.trim());
}

function periodStart(value: string): string {
  return value.split(/\s*[-–]\s*/)[0].trim();
}

function newBlock(type: ProjectBlockType): ProjectBlock {
  switch (type) {
    case "heading":
      return { type: "heading", text: "" };
    case "image":
      return { type: "image", url: "", caption: "", fit: "fill" };
    case "video":
      return { type: "video", url: "", caption: "", fit: "fill" };
    case "text":
      return { type: "text", text: "" };
    case "gallery":
      return { type: "gallery", images: [] };
    default:
      return { type: "link", url: "", label: "" };
  }
}

/** Drop blocks that would fail server validation (empty heading / no url). */
function blockHasContent(block: ProjectBlock): boolean {
  if (block.type === "heading") {
    return block.text.replace(/<[^>]*>/g, "").trim() !== "";
  }
  if (block.type === "text") {
    return block.text.replace(/<[^>]*>/g, "").trim() !== "";
  }
  if (block.type === "gallery") {
    return block.images.length > 0;
  }
  return block.url.trim() !== "";
}

const pendingLocalFiles = new Map<string, File>();

function registerLocalFile(url: string, file: File): void {
  pendingLocalFiles.set(url, file);
}

function clearLocalFiles(): void {
  for (const url of pendingLocalFiles.keys()) URL.revokeObjectURL(url);
  pendingLocalFiles.clear();
}

function projectTitleFromBlocks(blocks: ProjectBlock[]): string {
  const titleBlock =
    blocks.find((b) => b.type === "heading" && b.isTitle) ??
    blocks.find((b) => b.type === "heading");
  if (!titleBlock || titleBlock.type !== "heading") return "";
  return titleBlock.text.replace(/<[^>]*>/g, "").trim();
}

export default function ProjectsSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "projects"],
    queryFn: () => apiGet<Project[]>("/admin/projects"),
  });

  const [editing, setEditing] = useState<ProjectForm | null>(null);
  const [baseline, setBaseline] = useState<ProjectForm | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[] | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds([]);
    setPendingDeleteIds(null);
  };
  const selectionToastId = useRef<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [selection, setSelection] = useState<number | null>(null);
  const [galleryPhotoIndex, setGalleryPhotoIndex] = useState<number>(0);
  const [focusBlockIndex, setFocusBlockIndex] = useState<number | null>(null);
  const [projectTab, setProjectTab] = useState<"category" | "period" | "tech" | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "pending" | "saving" | "saved" | "error"
  >("idle");
  const autoSaveTimer = useRef<number | null>(null);
  const isNewSessionRef = useRef(false);
  const isMobile = useMediaQuery("max-md");
  const canSwipe = useMediaQuery("max-lg");
  const requestLeave = useRequestLeave();

  // Portal ke scroll container (SidebarInset) supaya sticky bottom berfungsi.
  const [actionBarHost, setActionBarHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setActionBarHost(document.querySelector<HTMLElement>("[data-transition-frame]"));
  }, []);

  // Di layar kecil editor proyek dibuka layar penuh (lihat aturan data-project-editor di index.css).
  const editorOpen = editing !== null;
  useEffect(() => {
    if (!editorOpen || !isMobile) return;
    const root = document.documentElement;
    root.dataset.projectEditor = "full";
    return () => {
      delete root.dataset.projectEditor;
    };
  }, [editorOpen, isMobile]);

  async function openEditor(item: Project | null) {
    isNewSessionRef.current = !item;
    setSelection(null);
    setFocusBlockIndex(null);
    setProjectTab(null);
    setSaveStatus("idle");
    setSelectMode(false);
    setSelectedIds([]);
    if (!item) {
      const empty = { ...EMPTY };
      setEditing(empty);
      setBaseline(empty);
      return;
    }
    setLoadingDetail(true);
    try {
      const detail = await apiGet<ProjectDetail>(`/admin/projects/${item.id}`);
      const form = toForm(detail);
      setEditing(form);
      setBaseline(form);
    } catch (err) {
      toastManager.add({
        title: t("Gagal memuat detail proyek"),
        description: (err as Error).message,
        type: "error",
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function buildProjectPayload(form: ProjectForm) {
    const resolvedUrls = new Map<string, string>();
    const media: ProjectMedia[] = [];
    for (const item of form.media) {
      if (!item.url.trim()) continue;
      if (item.url.startsWith("blob:")) {
        const file = pendingLocalFiles.get(item.url);
        if (file) {
          const { url } = await apiUpload<{ url: string }>(
            "/admin/uploads?scope=project-media",
            file,
          );
          resolvedUrls.set(item.url, url);
          media.push({ type: item.type, url });
          continue;
        }
      }
      media.push(item);
    }

    const content: ProjectBlock[] = [];
    for (const block of form.content) {
      if (!blockHasContent(block)) continue;
      if (block.type === "gallery") {
        const images: ProjectGalleryItem[] = [];
        for (const image of block.images) {
          if (image.url.startsWith("blob:")) {
            const file = pendingLocalFiles.get(image.url);
            if (file) {
              const { url } = await apiUpload<{ url: string }>(
                "/admin/uploads?scope=project-content",
                file,
              );
              resolvedUrls.set(image.url, url);
              images.push({ ...image, url });
              continue;
            }
          }
          images.push(image);
        }
        content.push({ ...block, images });
        continue;
      }
      if ((block.type === "image" || block.type === "video") && block.url.startsWith("blob:")) {
        const file = pendingLocalFiles.get(block.url);
        if (file) {
          const { url } = await apiUpload<{ url: string }>(
            "/admin/uploads?scope=project-content",
            file,
          );
          resolvedUrls.set(block.url, url);
          content.push({ ...block, url });
          continue;
        }
      }
      content.push(block);
    }

    return {
      payload: {
        title: projectTitleFromBlocks(form.content),
        category: form.category,
        date_range: form.date_range || null,
        media,
        tech_stacks: form.tech_stacks.map((item) => item.trim()).filter(Boolean),
        is_published: form.is_published,
        content,
      } satisfies ProjectPayload,
      resolvedUrls,
    };
  }

  const saveMutation = useMutation({
    mutationFn: ({ id, ...payload }: ProjectPayload & { id?: number }) =>
      id
        ? apiSend<ProjectDetail>("PUT", `/admin/projects/${id}`, payload)
        : apiSend<ProjectDetail>("POST", "/admin/projects", payload),
    onError: (err) => {
      toastManager.add({
        title: translate("Gagal menyimpan"),
        description: (err as Error).message,
        type: "error",
      });
    },
  });

  async function persistDraft(form: ProjectForm): Promise<void> {
    const { payload, resolvedUrls } = await buildProjectPayload(form);
    const saved = await saveMutation.mutateAsync({ ...payload, id: form.id });
    const applyResolved = (f: ProjectForm): ProjectForm => {
      if (resolvedUrls.size === 0) return f;
      return {
        ...f,
        media: f.media.map((m) => {
          const real = resolvedUrls.get(m.url);
          return real ? { ...m, url: real } : m;
        }),
        content: f.content.map((b) =>
          b.type === "image" || b.type === "video"
            ? ({ ...b, url: resolvedUrls.get(b.url) ?? b.url } as ProjectBlock)
            : b.type === "gallery"
              ? ({
                  ...b,
                  images: b.images.map((img) => ({
                    ...img,
                    url: resolvedUrls.get(img.url) ?? img.url,
                  })),
                } as ProjectBlock)
              : b,
        ),
      };
    };
    const next = { ...form, id: saved.id };
    setBaseline(applyResolved(next));
    // Pakai id dari server supaya simpan berikutnya jadi PUT; ganti URL blob: dengan URL unggahan.
    setEditing((current) =>
      current ? { ...applyResolved(current), id: saved.id } : current,
    );
    queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
  }

  function formValid(form: ProjectForm): boolean {
    return projectTitleFromBlocks(form.content) !== "" && form.category.trim() !== "";
  }

  function saveEditing(): Promise<unknown> {
    if (!editing) return Promise.resolve();
    if (!formValid(editing)) {
      return Promise.reject(new Error(t("Judul proyek (blok Judul) dan kategori wajib diisi")));
    }
    return persistDraft(editing);
  }

  function saveAndClose(published: boolean) {
    if (!editing) return;
    if (published && editing.media.length === 0) {
      toastManager.add({
        title: t("Unggah gambar cover dulu sebelum mempublikasikan"),
        type: "error",
      });
      return;
    }
    if (!formValid(editing)) {
      toastManager.add({
        title: t("Judul proyek (blok Judul) dan kategori wajib diisi"),
        type: "error",
      });
      return;
    }
    const close = () => {
      setEditing(null);
      setSelection(null);
      setFocusBlockIndex(null);
      setProjectTab(null);
    };
    if (!isDirty && editing.is_published === published) {
      close();
      return;
    }
    void persistDraft({ ...editing, is_published: published })
      .then(() => {
        close();
        toastManager.add({
          title: published ? t("Dipublikasikan") : t("Tersimpan sebagai draf"),
          description: t("Data proyek berhasil disimpan."),
          type: "success",
        });
      })
      .catch(() => {});
  }

  function submit() {
    saveAndClose(editing?.is_published ?? false);
  }

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/projects/${id}`),
    onSuccess: () => {
      setPendingDelete(null);
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toastManager.add({
        title: translate("Terhapus"),
        description: translate("Proyek berhasil dihapus."),
        type: "success",
      });
    },
    onError: (err) => {
      toastManager.add({
        title: translate("Gagal menghapus"),
        description: (err as Error).message,
        type: "error",
      });
    },
  });

  const deleteManyMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      await Promise.all(ids.map((id) => apiSend("DELETE", `/admin/projects/${id}`)));
    },
    onSuccess: () => {
      setPendingDeleteIds(null);
      setSelectedIds([]);
      setSelectMode(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
      toastManager.add({
        title: translate("Terhapus"),
        description: translate("{count} proyek berhasil dihapus.", { count: selectedIds.length }),
        type: "success",
      });
    },
    onError: (err) => {
      toastManager.add({
        title: translate("Gagal menghapus"),
        description: (err as Error).message,
        type: "error",
      });
    },
  });

  const items: Project[] = data ?? [];

  const categories = Array.from(
    new Set(items.map((item) => item.category.trim()).filter(Boolean)),
  );

  const isDirty =
    editing !== null &&
    baseline !== null &&
    JSON.stringify(editing) !== JSON.stringify(baseline);

  useEffect(() => {
    if (!editing) return;
    if (autoSaveTimer.current != null) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = null;
    // Form belum lengkap tidak bisa disimpan — jangan tampilkan "Menyimpan…" selamanya.
    if (!isDirty || !formValid(editing)) {
      if (!isDirty) setSaveStatus((status) => (status === "saved" ? status : "idle"));
      return;
    }
    setSaveStatus("pending");
    autoSaveTimer.current = window.setTimeout(() => {
      autoSaveTimer.current = null;
      setSaveStatus("saving");
      void persistDraft(editing)
        .then(() => setSaveStatus("saved"))
        .catch(() => setSaveStatus("error"));
    }, 1200);
    return () => {
      if (autoSaveTimer.current != null) window.clearTimeout(autoSaveTimer.current);
    };
  }, [editing, isDirty]);

  useUnsavedChangesGuard({ isDirty, onSave: saveEditing, autoSaveOnLeave: true });

  const textBlockHandles = useRef<Map<number, RichTextHandle>>(new Map());
  const [textFormatVersion, setTextFormatVersion] = useState(0);

  const registerTextHandle = useCallback((index: number, handle: RichTextHandle | null) => {
    if (handle) textBlockHandles.current.set(index, handle);
    else textBlockHandles.current.delete(index);
  }, []);

  const bumpTextFormat = useCallback(() => {
    setTextFormatVersion((v) => v + 1);
  }, []);

  const selectedBlock = selection != null ? (editing?.content[selection] ?? null) : null;
  const selectedMediaBlock =
    selectedBlock && (selectedBlock.type === "image" || selectedBlock.type === "video")
      ? selectedBlock
      : null;
  const selectedMobileBlock =
    selectedBlock &&
    (selectedBlock.type === "image" ||
      selectedBlock.type === "video" ||
      selectedBlock.type === "text")
      ? selectedBlock
      : null;
  const selectedGalleryBlock =
    selectedBlock && selectedBlock.type === "gallery" && selectedBlock.images.length > 0
      ? selectedBlock
      : null;
  const hasSidebar = projectTab != null || selectedMediaBlock != null;

  function openProjectTab(tab: "category" | "period" | "tech" | null) {
    setSelection(null);
    setProjectTab(tab);
  }

  function selectBlock(index: number, photoIndex = 0) {
    setProjectTab(null);
    setGalleryPhotoIndex(photoIndex);
    setSelection(index);
  }

  function updateSelectedBlock(patch: Partial<ProjectBlock>) {
    if (selection == null) return;
    setEditing((current) =>
      current
        ? {
            ...current,
            content: current.content.map((block, i) =>
              i === selection ? ({ ...block, ...patch } as ProjectBlock) : block,
            ),
          }
        : current,
    );
  }

  function appendBlock(type: ProjectBlockType) {
    if (!editing) return;
    const hasTitle = editing.content.some((b) => b.type === "heading" && b.isTitle);
    let next = newBlock(type);
    if (type === "heading" && !hasTitle) {
      next = { ...next, isTitle: true } as ProjectBlock;
    }
    const index = editing.content.length;
    setEditing({ ...editing, content: [...editing.content, next] });
    setFocusBlockIndex(index);
    if (!isMobile && (type === "image" || type === "video")) {
      selectBlock(index);
    }
  }

  useEffect(() => {
    if (!editing) return;
    function onKeyDown(event: KeyboardEvent) {
      if (selection == null) return;
      const index = selection;
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setEditing((current) =>
        current
          ? {
              ...current,
              content: current.content.filter((_, i) => i !== index),
            }
          : current,
      );
      setSelection(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing, selection]);

  useEffect(() => {
    setProjectEditorMode(
      editing
        ? isNewSessionRef.current
          ? "create"
          : editing.id
            ? editing.is_published
              ? "edit"
              : "draft"
            : "create"
        : null,
    );
  }, [editing]);

  useEffect(() => {
    setProjectSaveStatus(editing ? saveStatus : "idle");
    return () => setProjectSaveStatus("idle");
  }, [editing, saveStatus]);

  useEffect(() => {
    if (!editing) clearLocalFiles();
  }, [editing]);

  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;
  useEffect(() => {
    registerProjectEditorReset(() =>
      requestLeaveRef.current(() => {
        setEditing(null);
        setSelection(null);
        setProjectTab(null);
      }),
    );
    return () => registerProjectEditorReset(null);
  }, []);

  const showSelectionToast = !editing && selectMode;
  useEffect(() => {
    if (!showSelectionToast) {
      if (selectionToastId.current) {
        toastManager.close(selectionToastId.current);
        selectionToastId.current = null;
      }
      return;
    }
    const options = {
      title: t("{count} dipilih", { count: selectedIds.length }),
      timeout: 0,
      actionProps: {
        children: t("Hapus"),
        disabled: selectedIds.length === 0,
        onClick: () => setPendingDeleteIds(selectedIds),
      },
      data: {
        actionVariant: "destructive" as const,
        secondaryAction: { children: t("Batal"), onClick: exitSelectMode },
      },
    };
    if (selectionToastId.current) {
      toastManager.update(selectionToastId.current, options);
    } else {
      selectionToastId.current = toastManager.add({
        ...options,
        onClose: () => {
          selectionToastId.current = null;
          exitSelectMode();
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSelectionToast, selectedIds, t]);
  useEffect(
    () => () => {
      if (selectionToastId.current) toastManager.close(selectionToastId.current);
    },
    [],
  );

  return (
    <>
      <div className="space-y-6">
        {!editing && (
          <div className="sticky top-14 z-[15] before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-14 before:bg-background -mx-4 -mt-3 flex flex-wrap items-start justify-between gap-3 border-b bg-background px-4 py-3 lg:-mx-6 lg:px-6">
            <div>
              <h1 className="font-semibold text-xl">{title}</h1>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>

            {!isLoading && items.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div
                  aria-label={t("Mode tampilan proyek")}
                  className={segmentedControlRootClassName}
                  role="group"
                >
                  <button
                    aria-pressed={viewMode === "card"}
                    className={cn(segmentedControlItemVariants({ size: "sm", state: "checked" }))}
                    data-checked={viewMode === "card" ? "" : undefined}
                    aria-label={t("Kartu")}
                    onClick={() => setViewMode("card")}
                    title={t("Kartu")}
                    type="button"
                  >
                    <Squares2X2Icon />
                  </button>
                  <button
                    aria-pressed={viewMode === "list"}
                    className={cn(segmentedControlItemVariants({ size: "sm", state: "checked" }))}
                    data-checked={viewMode === "list" ? "" : undefined}
                    aria-label={t("Daftar")}
                    onClick={() => setViewMode("list")}
                    title={t("Daftar")}
                    type="button"
                  >
                    <ListBulletIcon />
                  </button>
                </div>

                <Button
                  aria-label={t("Pilih Item")}
                  aria-pressed={selectMode}
                  className={cn(selectMode && "bg-accent")}
                  onClick={() => {
                    if (selectMode) exitSelectMode();
                    else setSelectMode(true);
                  }}
                  size="icon-sm"
                  title={t("Pilih Item")}
                  type="button"
                  variant="outline"
                >
                  <ClipboardDocumentListIcon />
                </Button>
              </div>
            )}
          </div>
        )}

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat data proyek")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {editing ? (
        <div
          className={cn(
            "min-h-[calc(100svh-5rem)] space-y-4 lg:min-h-[calc(100svh-5.5rem)]",
            isMobile &&
              selectedMobileBlock &&
              (selectedMobileBlock.type === "text" ? "pb-52" : "pb-[52svh]"),
          )}
        >
          {isMobile && (
            <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2.5 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
              <Button
                aria-label={t("Batal")}
                onClick={() => requestLeave(() => setEditing(null))}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <ArrowLeftIcon />
              </Button>
              <span className="min-w-0 flex-1 truncate font-medium text-sm">
                {editing.id ? t("Ubah Proyek") : t("Tambah Proyek")}
              </span>
              {saveStatus === "pending" || saveStatus === "saving" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                  <Spinner className="size-3.5" />
                  {t("Menyimpan…")}
                </span>
              ) : saveStatus === "saved" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-success-foreground">
                  <CheckIcon className="size-4" />
                  {t("Tersimpan")}
                </span>
              ) : saveStatus === "error" ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-destructive">
                  <ExclamationCircleIcon className="size-4" />
                  {t("Gagal menyimpan")}
                </span>
              ) : null}
            </div>
          )}

          <form
            id="project-editor-form"
            noValidate
            onClick={() => setSelection(null)}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div
              className={cn(
                !isMobile && "flex items-start justify-center gap-6",
              )}
            >
              <div className={cn("min-w-0", !isMobile && "max-w-2xl flex-1")}>
                <div className="space-y-5">
                  <CoverMediaField
                    media={editing.media}
                    onChange={(media) => {
                      const hasTitle = editing.content.some(
                        (block) => block.type === "heading" && block.isTitle,
                      );
                      // Cover pertama kali diunggah: siapkan blok Judul di paling atas.
                      const content =
                        media.length > 0 && editing.media.length === 0 && !hasTitle
                          ? [{ type: "heading", text: "", isTitle: true } as ProjectBlock, ...editing.content]
                          : editing.content;
                      setEditing({ ...editing, media, content });
                      if (media.length === 0) setSelection(null);
                    }}
                  >
                    <ProjectMetaBar
                      categories={categories}
                      editing={editing}
                      isMobile={isMobile}
                      onChangeProject={(patch) => setEditing({ ...editing, ...patch })}
                      onProjectTab={openProjectTab}
                      projectTab={projectTab}
                    />
                  </CoverMediaField>

                  {/* Tanpa cover, blok disembunyikan (tidak dihapus) dan muncul lagi saat cover diunggah. */}
                  {editing.media.length > 0 && (
                    <ContentEditor
                      blocks={editing.content}
                      focusIndex={focusBlockIndex}
                      onChange={(content) => setEditing({ ...editing, content })}
                      onDeselect={() => setSelection(null)}
                      onFocusDone={() => setFocusBlockIndex(null)}
                      onFormatStateChange={bumpTextFormat}
                      onSelect={selectBlock}
                      registerTextHandle={registerTextHandle}
                      selectedIndex={selection}
                    />
                  )}
                </div>
              </div>

              {!isMobile && hasSidebar && (
                <aside
                  className="sticky top-[78px] w-80 shrink-0 self-start"
                  onClick={(event) => event.stopPropagation()}
                >
                  <EditorSidebar
                    categories={categories}
                    editing={editing}
                    onChangeBlock={updateSelectedBlock}
                    onChangeProject={(patch) => setEditing({ ...editing, ...patch })}
                    onClose={() => {
                      setProjectTab(null);
                      setSelection(null);
                    }}
                    projectTab={projectTab}
                    settingsBlock={selectedMediaBlock}
                    textFormatVersion={textFormatVersion}
                    textHandle={null}
                  />
                </aside>
              )}
            </div>
          </form>
        </div>
      ) : isLoading ? (
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
            <EmptyTitle>{t("Belum ada proyek")}</EmptyTitle>
            <EmptyDescription>{t("Tambahkan proyek atau postingan portofolio.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ProjectCardItem
              isMobile={canSwipe}
              item={item}
              key={item.id}
              loadingDetail={loadingDetail}
              onDelete={() => setPendingDelete(item)}
              onEdit={() => openEditor(item)}
              onToggleSelect={() =>
                setSelectedIds((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id],
                )
              }
              selectMode={selectMode}
              selected={selectedIds.includes(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <ProjectListItem
              isMobile={canSwipe}
              item={item}
              key={item.id}
              loadingDetail={loadingDetail}
              onDelete={() => setPendingDelete(item)}
              onEdit={() => openEditor(item)}
              onToggleSelect={() =>
                setSelectedIds((prev) =>
                  prev.includes(item.id)
                    ? prev.filter((id) => id !== item.id)
                    : [...prev, item.id],
                )
              }
              selectMode={selectMode}
              selected={selectedIds.includes(item.id)}
            />
          ))}
        </div>
      )}

      {!editing && !selectMode && (
        <Button
          aria-label={t("Tambah proyek")}
          className="fixed right-6 bottom-6 z-40 size-16 sm:size-16 rounded-full shadow-lg before:rounded-full"
          disabled={loadingDetail}
          onClick={() => openEditor(null)}
          size="icon"
          type="button"
        >
          <PlusIcon className="size-7" />
        </Button>
      )}

      <ConfirmDialog
        description={
          pendingDelete
            ? t("Proyek \"{title}\" akan dihapus permanen.", { title: pendingDelete.title })
            : pendingDeleteIds
              ? t("{count} proyek akan dihapus permanen.", { count: pendingDeleteIds.length })
              : undefined
        }
        loading={deleteMutation.isPending || deleteManyMutation.isPending}
        onConfirm={() => {
          if (pendingDelete) {
            deleteMutation.mutate(pendingDelete.id);
          } else if (pendingDeleteIds) {
            deleteManyMutation.mutate(pendingDeleteIds);
          }
        }}
        onOpenChange={(next) => {
          if (!next) {
            setPendingDelete(null);
            setPendingDeleteIds(null);
          }
        }}
        open={pendingDelete !== null || pendingDeleteIds !== null}
        title={
          pendingDelete
            ? t("Hapus proyek?")
            : pendingDeleteIds
              ? t("Hapus {count} proyek?", { count: pendingDeleteIds.length })
              : t("Hapus proyek?")
        }
      />
      </div>

      {selectedGalleryBlock && (
        <GallerySettingsOverlay
          block={selectedGalleryBlock}
          initialIndex={galleryPhotoIndex}
          onChange={updateSelectedBlock}
          onClose={() => setSelection(null)}
        />
      )}

      {isMobile && selectedMobileBlock && (
        <Drawer
          modal={false}
          onOpenChange={(open) => {
            if (!open) setSelection(null);
          }}
          open
          position="bottom"
        >
          <DrawerPopup className="max-h-[48svh]" showBackdrop={false} showBar showCloseButton>
            <DrawerHeader className="px-6 pt-4 pb-1">
              <DrawerTitle className="text-base">
                {settingsBlockTitle(selectedMobileBlock)}
              </DrawerTitle>
            </DrawerHeader>
            <DrawerPanel className="px-6 pt-2 pb-4" data-base-ui-swipe-ignore>
              {selectedMobileBlock.type === "text" ? (
                <TextBlockProperties
                  formatVersion={textFormatVersion}
                  handle={
                    selection != null ? (textBlockHandles.current.get(selection) ?? null) : null
                  }
                />
              ) : (
                <MediaBlockProperties
                  block={selectedMobileBlock}
                  onChange={updateSelectedBlock}
                />
              )}
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      )}

      {editing &&
        actionBarHost &&
        createPortal(
          <div className="sticky bottom-0 z-30 shrink-0 border-t bg-background/95 backdrop-blur">
            <div className="px-4 py-3 lg:px-6">
                <div
                  className={cn(
                    "items-center gap-2",
                    editing.media.length > 0
                      ? "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                      : "flex justify-between",
                  )}
                >
                  <div className="flex min-w-0 items-center justify-start gap-2">
                    {!isNewSessionRef.current &&
                      (editing.is_published ? (
                        <Badge className="shrink-0" variant="success">{t("Terbit")}</Badge>
                      ) : (
                        <Badge className="shrink-0" variant="warning">{t("Draf")}</Badge>
                      ))}
                    {!isMobile &&
                      (saveStatus === "pending" || saveStatus === "saving" ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                          <Spinner className="size-3.5 shrink-0" />
                          <span className="truncate">{t("Menyimpan…")}</span>
                        </span>
                      ) : saveStatus === "saved" ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-success-foreground">
                          <CheckIcon className="size-4 shrink-0" />
                          <span className="truncate">{t("Tersimpan")}</span>
                        </span>
                      ) : saveStatus === "error" ? (
                        <span className="inline-flex min-w-0 items-center gap-1.5 text-sm font-medium text-destructive">
                          <ExclamationCircleIcon className="size-4 shrink-0" />
                          <span className="truncate">{t("Gagal menyimpan")}</span>
                        </span>
                      ) : null)}
                  </div>
                  {editing.media.length > 0 && (
                    <div className="flex items-center justify-center">
                      <AddBlockMenu compact onAdd={appendBlock} side="top" sideOffset={8} />
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button loading={saveMutation.isPending} type="button">
                            <ArrowDownTrayIcon />
                            {t("Simpan")}
                            <ChevronDownIcon className="size-4" />
                          </Button>
                        }
                      />
                      <MenuPopup align="end" side="top" sideOffset={8} className="w-60">
                        <MenuGroup>
                          <MenuItem disabled={editing.media.length === 0} onClick={() => saveAndClose(true)}>
                            {editing.is_published ? <ArrowDownTrayIcon /> : <ArrowUpTrayIcon />}
                            {editing.is_published ? t("Simpan") : t("Simpan dan Publikasikan")}
                          </MenuItem>
                          <MenuItem onClick={() => saveAndClose(false)}>
                            <DocumentArrowDownIcon />
                            {t("Simpan Sebagai Draf")}
                          </MenuItem>
                        </MenuGroup>
                      </MenuPopup>
                    </Menu>
                  </div>
                </div>
              </div>
          </div>,
          actionBarHost,
        )}
    </>
  );
}

function projectTabLabel(tab: "category" | "period" | "tech" | null): string {
  return tab === "category"
    ? translate("Kategori")
    : tab === "period"
      ? translate("Periode")
      : tab === "tech"
        ? translate("Tech Stack")
        : "";
}

function ProjectMetaBar({
  projectTab,
  onProjectTab,
  isMobile,
  editing,
  categories,
  onChangeProject,
}: {
  projectTab: "category" | "period" | "tech" | null;
  onProjectTab: (tab: "category" | "period" | "tech" | null) => void;
  isMobile: boolean;
  editing: ProjectForm;
  categories: string[];
  onChangeProject: (patch: Partial<ProjectForm>) => void;
}) {
  const { t } = useLanguage();
  const tabLabel = projectTabLabel(projectTab);

  const pillClass =
    "inline-flex h-8 items-center gap-1.5 rounded-lg border bg-background/85 px-2 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:h-7 sm:px-2.5";

  return (
    <>
      <div className="absolute start-2 top-2 z-10 flex flex-wrap gap-1.5">
      <button className={pillClass} onClick={() => onProjectTab("category")} type="button">
        <TagIcon className="size-4 shrink-0 sm:size-3.5" />
        {editing.category.trim() ? (
          <span className="max-w-44 truncate">{editing.category}</span>
        ) : (
          t("Kategori")
        )}
      </button>
      <button className={pillClass} onClick={() => onProjectTab("period")} type="button">
        <CalendarDaysIcon className="size-4 shrink-0 sm:size-3.5" />
        {editing.date_range.trim() ? (
          <span className="max-w-44 truncate">{abbreviatePeriod(editing.date_range)}</span>
        ) : (
          t("Periode")
        )}
      </button>
      </div>
      <div className="absolute start-2 bottom-2 z-10">
      <button className={pillClass} onClick={() => onProjectTab("tech")} type="button">
        <Square3Stack3DIcon className="size-4 shrink-0 sm:size-3.5" />
        {editing.tech_stacks.length > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            {editing.tech_stacks.slice(0, 3).map((tech) => (
              <TechLogoPreview key={tech} name={tech} />
            ))}
            {editing.tech_stacks.length > 3 && (
              <span className="font-medium">+{editing.tech_stacks.length - 3}</span>
            )}
          </span>
        ) : (
          t("Tech Stack")
        )}
      </button>
      </div>

      {isMobile && projectTab && (
        <Drawer
          onOpenChange={(open) => {
            if (!open) onProjectTab(null);
          }}
          open={projectTab != null}
          position="bottom"
        >
          <DrawerPopup showBar>
            <DrawerHeader className="px-6 pt-4 pb-1">
              <DrawerTitle className="text-base">{tabLabel}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel className="px-6 pt-1 pb-4" data-base-ui-swipe-ignore>
              <ProjectDataPanel
                categories={categories}
                editing={editing}
                onChange={onChangeProject}
                tab={projectTab}
              />
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
      )}
    </>
  );
}

function CoverMediaField({
  media,
  onChange,
  children,
}: {
  media: ProjectMedia[];
  onChange: (media: ProjectMedia[]) => void;
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const item = media[0] ?? null;

  function handleReplaceFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    for (const file of list) {
      const validation = validateUpload(file);
      if (!validation.ok) {
        toastManager.add({
          title: t("Gagal memilih {name}", { name: file.name }),
          description: validation.message,
          type: "error",
        });
        continue;
      }
      const isVideo = file.type.startsWith("video/");
      const url = URL.createObjectURL(file);
      registerLocalFile(url, file);
      onChange([{ type: isVideo ? "video" : "image", url }]);
      return;
    }
  }

  if (item) {
    return (
      <div className="relative">
        <MediaPreview type={item.type} url={item.url} />
        {children}
        <button
          aria-label={t("Ganti foto")}
          className="absolute end-2 top-2 z-10 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border bg-background/85 px-2 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:h-7 sm:px-2.5"
          onClick={(event) => {
            event.stopPropagation();
            replaceInputRef.current?.click();
          }}
          type="button"
        >
          <PhotoIcon className="size-4 shrink-0 sm:size-3.5" />
          {t("Ganti foto")}
        </button>
        <input
          accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            event.target.value = "";
            handleReplaceFiles(files);
          }}
          ref={replaceInputRef}
          type="file"
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <MediaDropzone onAdd={(added) => onChange([added])} />
      {children}
    </div>
  );
}

function MediaDropzone({ onAdd }: { onAdd: (item: ProjectMedia) => void }) {
  const { t } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    for (const file of list) {
      const validation = validateUpload(file);
      if (!validation.ok) {
        toastManager.add({
          title: t("Gagal memilih {name}", { name: file.name }),
          description: validation.message,
          type: "error",
        });
        continue;
      }
      const isVideo = file.type.startsWith("video/");
      const url = URL.createObjectURL(file);
      registerLocalFile(url, file);
      onAdd({ type: isVideo ? "video" : "image", url });
      return;
    }
  }

  return (
    <div
      className={cn(
        "flex aspect-video w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center transition-colors",
        dragging ? "border-primary bg-accent" : "border-input hover:bg-accent/50",
      )}
      onClick={() => inputRef.current?.click()}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <ArrowUpTrayIcon className="size-6 text-muted-foreground" />
      <p className="font-medium text-sm">{t("Unggah gambar/video")}</p>
      <p className="text-muted-foreground text-xs">
        {t("Gambar maks {image}, video maks {video}", {
          image: formatUploadSize(UPLOAD_LIMITS.file),
          video: formatUploadSize(UPLOAD_LIMITS.video),
        })}
      </p>
      <input
        accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          handleFiles(files);
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

function MediaPreview({ type, url }: { type: "image" | "video"; url: string }) {
  if (!url) {
    return (
      <span className="grid aspect-video w-full place-items-center rounded-md border border-dashed bg-muted">
        {type === "image" ? (
          <PhotoIcon className="size-6 text-muted-foreground" />
        ) : (
          <VideoCameraIcon className="size-6 text-muted-foreground" />
        )}
      </span>
    );
  }
  if (type === "image") {
    return <img alt="" className="aspect-video w-full rounded-md border object-cover" src={url} />;
  }
  const embed = toEmbedUrl(url);
  if (embed) {
    return (
      <iframe
        allowFullScreen
        className="aspect-video w-full rounded-md border"
        src={embed}
        title="Video"
      />
    );
  }
  return <video className="aspect-video w-full rounded-md border object-cover" controls src={url} />;
}

function toEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  const youtube = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/,
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;
  const vimeo = trimmed.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function ProjectCover({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="grid h-full w-full place-items-center">
        <RectangleStackIcon className="size-6 text-muted-foreground" />
      </span>
    );
  }

  return (
    <img
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
      src={url}
    />
  );
}

function ProjectItemBody({ item }: { item: Project }) {
  const { language } = useLanguage();
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2 p-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="line-clamp-2 font-medium text-sm">{item.title}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
          <span className="flex min-w-0 items-center gap-1">
            <TagIcon className="size-3.5 shrink-0" />
            <span className="truncate">{item.category}</span>
          </span>
          {item.date_range && (
            <span className="flex items-center gap-1">
              <CalendarDaysIcon className="size-3.5 shrink-0" />
              {abbreviatePeriod(item.date_range)}
            </span>
          )}
          {item.is_published && item.published_at && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5 shrink-0" />
              <time dateTime={item.published_at}>
                {new Date(item.published_at).toLocaleDateString(
                  language === "en" ? "en-US" : "id-ID",
                  { day: "numeric", month: "short", year: "numeric" },
                )}
              </time>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectItemMenu({
  loadingDetail,
  onEdit,
  onDelete,
}: {
  loadingDetail: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Menu>
      <MenuTrigger
        render={
          <Button
            aria-label={t("Opsi")}
            className="bg-background/85 shadow-sm backdrop-blur-sm hover:bg-background"
            size="icon-sm"
            variant="ghost"
          />
        }
      >
        <EllipsisHorizontalIcon />
      </MenuTrigger>
      <MenuPopup align="end">
        <MenuItem disabled={loadingDetail} onClick={onEdit}>
          <PencilIcon />
          {t("Ubah")}
        </MenuItem>
        <MenuItem onClick={onDelete} variant="destructive">
          <TrashIcon />
          {t("Hapus")}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}

function TechLogoChip({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  if (!logo || failed) return null;

  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-md bg-white shadow-sm">
      <img
        alt=""
        className="size-3.5 object-contain"
        decoding="async"
        loading="lazy"
        onError={() => setFailed(true)}
        src={logo}
      />
    </span>
  );
}

function ProjectItemCover({
  item,
  selectMode,
  selected,
  onToggleSelect,
  loadingDetail,
  onEdit,
  onDelete,
  className,
  hideMenu = false,
}: {
  item: Project;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  loadingDetail: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
  /** Disembunyikan saat Ubah/Hapus tersedia lewat slide (layar kecil-sedang). */
  hideMenu?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-muted",
        className ?? "aspect-video",
      )}
    >
      {item.media[0]?.type === "image" ? (
        <ProjectCover url={item.media[0].url} />
      ) : (
        <span className="grid h-full w-full place-items-center">
          <RectangleStackIcon className="size-6 text-muted-foreground" />
        </span>
      )}

      <div className="absolute start-2 top-2 z-10 flex items-center gap-1.5">
        {selectMode && (
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-background p-0.5 shadow-md">
            <Checkbox
              aria-label={t("Pilih {title}", { title: item.title })}
              checked={selected}
              className="border-0 bg-transparent shadow-none"
              onCheckedChange={onToggleSelect}
            />
          </span>
        )}
        <StatusBadge isPublished={item.is_published} />
      </div>

      {item.tech_stacks.length > 0 && (
        <div className="absolute start-2 bottom-2 z-10 flex max-w-[calc(100%-2.5rem)] flex-wrap gap-1">
          {item.tech_stacks.slice(0, 4).map((tech) => (
            <TechLogoChip key={tech} name={tech} />
          ))}
          {item.tech_stacks.length > 4 && (
            <span className="inline-flex items-center rounded-md bg-background/85 px-1.5 py-0.5 text-[10px] font-medium text-foreground leading-none backdrop-blur-sm">
              +{item.tech_stacks.length - 4}
            </span>
          )}
        </div>
      )}

      {!selectMode && !hideMenu && (
        <div className="absolute end-2 bottom-2 z-10">
          <ProjectItemMenu loadingDetail={loadingDetail} onDelete={onDelete} onEdit={onEdit} />
        </div>
      )}
    </div>
  );
}

function ProjectCardItem({
  item,
  isMobile,
  loadingDetail,
  selectMode,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  item: Project;
  isMobile: boolean;
  loadingDetail: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="group overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-sm">
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
        enabled={isMobile}
      >
        <div className="flex flex-col">
          <ProjectItemCover
            hideMenu={isMobile}
            item={item}
            loadingDetail={loadingDetail}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleSelect={onToggleSelect}
            selectMode={selectMode}
            selected={selected}
          />
          <ProjectItemBody item={item} />
        </div>
      </SwipeActions>
    </div>
  );
}

function ProjectListItem({
  item,
  isMobile,
  loadingDetail,
  selectMode,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
}: {
  item: Project;
  isMobile: boolean;
  loadingDetail: boolean;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="group h-36 overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-sm">
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
        className="h-full"
        contentClassName="h-full"
        enabled={isMobile}
      >
        <div className="flex h-full flex-row">
          <ProjectItemCover
            hideMenu={isMobile}
            className="h-full w-40 sm:w-48"
            item={item}
            loadingDetail={loadingDetail}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleSelect={onToggleSelect}
            selectMode={selectMode}
            selected={selected}
          />
          <ProjectItemBody item={item} />
        </div>
      </SwipeActions>
    </div>
  );
}

// Tidak memangkas spasi: spasi di ujung adalah ketikan pengguna, dan memangkasnya
// membuat DOM ditulis ulang sehingga kursor melompat.
function stripTrailingBr(html: string): string {
  return html.replace(/<br\s*\/?>(?=\s*(<\/\w+>\s*)*$)/gi, "");
}

function sanitizeSingleLineHtml(html: string): string {
  // <br> penanda baris kosong dari browser (di ujung) dibuang, bukan dijadikan spasi.
  const clean = stripTrailingBr(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div)[^>]*>\s*<(p|div)[^>]*>/gi, " ")
    .replace(/<\/?(p|div)[^>]*>/gi, "");
  const h2Open = clean.match(/<h2[^>]*>/i);
  if (!h2Open) return clean;
  const start = clean.indexOf(h2Open[0]);
  const end = clean.indexOf("</h2>", start);
  if (end === -1) return clean;
  const inside = clean.slice(start + h2Open[0].length, end);
  const before = clean.slice(0, start).trim();
  const after = clean.slice(end + "</h2>".length).trim();
  if (!before && !after && start === 0 && end + 5 === clean.length) return clean;
  return `<h2>${before ? `${before} ` : ""}${inside}${after ? ` ${after}` : ""}</h2>`;
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el.querySelector("h1,h2,h3") ?? el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

interface TextFormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  unorderedList: boolean;
  orderedList: boolean;
}

interface RichTextHandle {
  exec: (command: "bold" | "italic" | "underline" | "removeFormat") => void;
  toggleList: (command: "insertUnorderedList" | "insertOrderedList") => void;
  insertLink: (url: string) => void;
  getFormatState: () => TextFormatState;
}

function RichTextBlock({
  value,
  onChange,
  autoFocus,
  onAutoFocusDone,
  className,
  singleLine = false,
  registerHandle,
  onFormatStateChange,
}: {
  value: string;
  onChange: (html: string) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  className?: string;
  singleLine?: boolean;
  registerHandle?: (handle: RichTextHandle | null) => void;
  onFormatStateChange?: () => void;
}) {
  const { t } = useLanguage();
  const isTouch = useMediaQuery("max-md");
  const containerRef = useRef<HTMLDivElement>(null);
  const editableRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef(value);
  const savedRange = useRef<Range | null>(null);
  const isTouchRef = useRef(isTouch);
  isTouchRef.current = isTouch;
  const [floatingTools, setFloatingTools] = useState<{ top: number; left: number } | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onFormatStateChangeRef = useRef(onFormatStateChange);
  onFormatStateChangeRef.current = onFormatStateChange;

  const seededRef = useRef(false);
  useEffect(() => {
    const el = editableRef.current;
    if (!el) return;
    // Nilai yang baru saja kita kirim lewat onChange tidak ditulis ulang ke DOM.
    if (seededRef.current && value === lastValue.current) return;
    seededRef.current = true;
    // Always seed the DOM from `value` on mount, otherwise existing blocks render empty.
    const seed = singleLine ? sanitizeSingleLineHtml(value) : value;
    if (seed !== el.innerHTML) {
      el.innerHTML = seed;
    }
    lastValue.current = seed;
  }, [value, singleLine]);

  useEffect(() => {
    if (!autoFocus) return;
    const el = editableRef.current;
    if (!el) return;
    el.focus();
    // Kursor harus di dalam tag heading, kalau tidak teks keluar jadi baris kedua.
    const inner = el.querySelector("h1,h2,h3") ?? el;
    const range = document.createRange();
    range.selectNodeContents(inner);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    savedRange.current = range.cloneRange();
    onAutoFocusDone?.();
  }, [autoFocus, onAutoFocusDone]);

  const emit = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    let html = el.innerHTML;
    if (singleLine) {
      html = sanitizeSingleLineHtml(html);
      // DOM hanya ditulis ulang untuk perubahan struktur (mis. Enter/paste), bukan untuk
      // <br> penanda di ujung yang ditambahkan browser, supaya kursor tidak melompat.
      if (html !== stripTrailingBr(el.innerHTML)) {
        el.innerHTML = html;
        placeCaretAtEnd(el);
      }
    }
    lastValue.current = html;
    onChangeRef.current(html);
  }, [singleLine]);

  const captureSelection = useCallback(() => {
    const sel = window.getSelection();
    const el = editableRef.current;
    const container = containerRef.current;
    if (!el || !sel || sel.rangeCount === 0) {
      setFloatingTools(null);
      return;
    }
    if (el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      savedRange.current = range.cloneRange();
      onFormatStateChangeRef.current?.();
      if (!isTouchRef.current && registerHandle && container && !sel.isCollapsed) {
        const rect = range.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        setFloatingTools({
          top: rect.top - containerRect.top - 44,
          left: rect.left - containerRect.left,
        });
        return;
      }
    }
    setFloatingTools(null);
  }, [registerHandle]);

  const handleRef = useRef<RichTextHandle | null>(null);

  useEffect(() => {
    if (!registerHandle) return;
    document.addEventListener("selectionchange", captureSelection);
    return () => document.removeEventListener("selectionchange", captureSelection);
  }, [registerHandle, captureSelection]);

  useEffect(() => {
    if (!registerHandle) return;

    function restoreSelection() {
      const el = editableRef.current;
      if (!el) return;
      el.focus();
      const range = savedRange.current;
      if (range && el.contains(range.commonAncestorContainer)) {
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } else {
        placeCaretAtEnd(el);
      }
    }

    function syncSavedRange() {
      const sel = window.getSelection();
      const el = editableRef.current;
      if (el && sel && sel.rangeCount > 0 && el.contains(sel.anchorNode)) {
        savedRange.current = sel.getRangeAt(0).cloneRange();
      }
    }

    const handle: RichTextHandle = {
      exec(command) {
        restoreSelection();
        document.execCommand(command);
        syncSavedRange();
        emit();
        onFormatStateChangeRef.current?.();
      },
      toggleList(command) {
        restoreSelection();
        document.execCommand(command);
        syncSavedRange();
        emit();
        onFormatStateChangeRef.current?.();
      },
      insertLink(url) {
        restoreSelection();
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
          document.execCommand("createLink", false, url);
        } else {
          document.execCommand(
            "insertHTML",
            false,
            `<a href="${url.replace(/"/g, "&quot;")}">${url}</a>`,
          );
        }
        syncSavedRange();
        emit();
        onFormatStateChangeRef.current?.();
      },
      getFormatState() {
        const el = editableRef.current;
        const sel = window.getSelection();
        if (!el || !sel || sel.rangeCount === 0 || !el.contains(sel.anchorNode)) {
          return {
            bold: false,
            italic: false,
            underline: false,
            unorderedList: false,
            orderedList: false,
          };
        }
        try {
          return {
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            unorderedList: document.queryCommandState("insertUnorderedList"),
            orderedList: document.queryCommandState("insertOrderedList"),
          };
        } catch {
          return {
            bold: false,
            italic: false,
            underline: false,
            unorderedList: false,
            orderedList: false,
          };
        }
      },
    };

    handleRef.current = handle;
    registerHandle(handle);
    return () => {
      handleRef.current = null;
      registerHandle(null);
    };
  }, [registerHandle, emit]);

  function promptInsertLink() {
    const url = window.prompt(t("Masukkan URL tautan:"));
    if (!url) return;
    handleRef.current?.insertLink(url);
  }

  return (
    <div className="relative min-w-0 max-w-full" ref={containerRef}>
      <div
        className={cn(
          className,
          "min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] outline-none [&_a]:text-primary [&_a]:underline [&_b]:font-bold [&_em]:italic [&_strong]:font-bold [&_u]:underline [&_ol]:list-decimal [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:ps-6",
        )}
        contentEditable
        onBlur={() => {
          window.setTimeout(() => setFloatingTools(null), 150);
        }}
        onInput={emit}
        onKeyDown={(event) => {
          if (singleLine && event.key === "Enter") event.preventDefault();
          if (singleLine && (event.ctrlKey || event.metaKey)) {
            const key = event.key.toLowerCase();
            if (key === "b" || key === "i" || key === "u") event.preventDefault();
          }
        }}
        onKeyUp={captureSelection}
        onMouseUp={captureSelection}
        onPaste={(event) => {
          if (!singleLine) return;
          event.preventDefault();
          const text = event.clipboardData
            .getData("text/plain")
            .replace(/\s*\r?\n\s*/g, " ");
          document.execCommand("insertText", false, text);
        }}
        ref={editableRef}
        role="textbox"
        suppressContentEditableWarning
      />

      {!isTouch && registerHandle && floatingTools && (
        <div
          className="absolute z-20"
          onMouseDown={(event) => event.preventDefault()}
          style={{ top: floatingTools.top, left: floatingTools.left }}
        >
          <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md">
            <Toggle
              aria-label={t("Tebal")}
              onPressedChange={() => handleRef.current?.exec("bold")}
              size="sm"
              type="button"
            >
              <BoldIcon />
            </Toggle>
            <Toggle
              aria-label={t("Miring")}
              onPressedChange={() => handleRef.current?.exec("italic")}
              size="sm"
              type="button"
            >
              <ItalicIcon />
            </Toggle>
            <Toggle
              aria-label={t("Garis bawah")}
              onPressedChange={() => handleRef.current?.exec("underline")}
              size="sm"
              type="button"
            >
              <UnderlineIcon />
            </Toggle>
            <Button
              aria-label={t("Tautan")}
              className="text-muted-foreground"
              onClick={promptInsertLink}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <LinkIcon />
            </Button>
            <span className="mx-0.5 h-5 w-px bg-border" />
            <Button
              aria-label={t("Daftar poin")}
              className="text-muted-foreground"
              onClick={() => handleRef.current?.toggleList("insertUnorderedList")}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <ListBulletIcon />
            </Button>
            <Button
              aria-label={t("Daftar angka")}
              className="text-muted-foreground"
              onClick={() => handleRef.current?.toggleList("insertOrderedList")}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <NumberedListIcon />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function HeadingBlock({
  value,
  onChange,
  autoFocus,
  onAutoFocusDone,
}: {
  value: string;
  onChange: (html: string) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
}) {
  return (
    <RichTextBlock
      autoFocus={autoFocus}
      className="min-h-9 w-full border-0 bg-transparent px-1 py-1 font-bold text-3xl placeholder:text-muted-foreground [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-normal [&_h2:empty]:before:text-muted-foreground [&_h2:empty]:before:content-['Judul'] [&_h3]:text-lg [&_h3]:font-normal [&:empty]:before:text-muted-foreground [&:empty]:before:content-['Judul']"
      onChange={onChange}
      onAutoFocusDone={onAutoFocusDone}
      singleLine
      value={value}
    />
  );
}

function hostnameFromUrl(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function logoFromUrl(url: string): string | null {
  const host = hostnameFromUrl(url);
  return host ? logoFromDomain(host) : null;
}

function AddBlockMenu({
  onAdd,
  side = "bottom",
  sideOffset,
  compact = false,
}: {
  onAdd: (type: ProjectBlockType) => void;
  side?: "top" | "bottom";
  sideOffset?: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <MenuTrigger
        render={
          compact ? (
            <Button
              aria-label={t("Tambah Blok")}
              className="w-9 px-0 text-muted-foreground sm:w-auto sm:px-[calc(--spacing(3)-1px)]"
              title={t("Tambah Blok")}
              type="button"
              variant="outline"
            >
              <PlusIcon />
              <span className="hidden sm:inline">{t("Tambah Blok")}</span>
            </Button>
          ) : (
            <Button className="text-muted-foreground" size="sm" type="button" variant="outline">
              <PlusIcon /> {t("Tambah Blok")}
            </Button>
          )
        }
      />
      <MenuPopup align="center" side={side} sideOffset={sideOffset}>
        <MenuGroup>
          <MenuGroupLabel>{t("Tambah blok")}</MenuGroupLabel>
          <MenuItem onClick={() => onAdd("heading")}>
            <H1Icon />
            {t("Judul")}
          </MenuItem>
          <MenuItem onClick={() => onAdd("text")}>
            <Bars3BottomLeftIcon />
            {t("Teks")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => onAdd("image")}>
            <PhotoIcon />
            {t("Gambar")}
          </MenuItem>
          <MenuItem onClick={() => onAdd("video")}>
            <VideoCameraIcon />
            Video
          </MenuItem>
          <MenuItem onClick={() => onAdd("gallery")}>
            <PhotoIcon />
            {t("Galeri")}
          </MenuItem>
          <MenuSeparator />
          <MenuItem onClick={() => onAdd("link")}>
            <LinkIcon />
            {t("Tautan")}
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}

function ContentEditor({
  blocks,
  onChange,
  focusIndex,
  onFocusDone,
  selectedIndex,
  onSelect,
  onDeselect,
  registerTextHandle,
  onFormatStateChange,
}: {
  blocks: ProjectBlock[];
  onChange: (blocks: ProjectBlock[]) => void;
  focusIndex: number | null;
  onFocusDone: () => void;
  selectedIndex?: number | null;
  onSelect?: (index: number, photoIndex?: number) => void;
  onDeselect?: () => void;
  registerTextHandle?: (index: number, handle: RichTextHandle | null) => void;
  onFormatStateChange?: () => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = Number(active.id);
    const to = Number(over.id);
    onChange(arrayMove(blocks, from, to));
    if (selectedIndex === from) {
      onSelect?.(to);
    }
  }

  function updateBlock(index: number, patch: Partial<ProjectBlock>) {
    onChange(
      blocks.map((block, i) => (i === index ? ({ ...block, ...patch } as ProjectBlock) : block)),
    );
  }

  function removeBlock(index: number) {
    onChange(blocks.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      onDeselect?.();
    } else if (selectedIndex != null && selectedIndex > index) {
      onSelect?.(selectedIndex - 1);
    }
  }

  if (blocks.length === 0) return null;

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={blocks.map((_, i) => i)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-8 lg:space-y-3">
          {blocks.map((block, index) => (
            <li key={index}>
              <SortableCanvasBlock
                autoFocus={focusIndex === index}
                block={block}
                id={index}
                onChange={(patch) => updateBlock(index, patch)}
                onAutoFocusDone={onFocusDone}
                onFormatStateChange={onFormatStateChange}
                onRemove={() => removeBlock(index)}
                onSelect={onSelect ? (photoIndex?: number) => onSelect(index, photoIndex) : undefined}
                registerTextHandle={
                  registerTextHandle
                    ? (handle) => registerTextHandle(index, handle)
                    : undefined
                }
                selected={selectedIndex === index}
              />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableCanvasBlock({
  id,
  block,
  onChange,
  onRemove,
  autoFocus,
  onAutoFocusDone,
  selected,
  onSelect,
  registerTextHandle,
  onFormatStateChange,
}: {
  id: number;
  block: ProjectBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
  onRemove: () => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  selected?: boolean;
  onSelect?: (photoIndex?: number) => void;
  registerTextHandle?: (handle: RichTextHandle | null) => void;
  onFormatStateChange?: () => void;
}) {
  const isTitle = block.type === "heading" && !!block.isTitle;
  const isMobile = useMediaQuery("max-md");
  const blockElRef = useRef<HTMLDivElement | null>(null);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isTitle,
  });

  useEffect(() => {
    if (!selected || !isMobile) return;
    const frame = requestAnimationFrame(() => {
      blockElRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, isMobile]);
  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  const { t } = useLanguage();
  const fitAlignClass =
    (block.type === "image" || block.type === "video") && block.url && block.fit === "fit"
      ? cn(
          block.type === "video" ? "w-[65%]" : "w-fit max-w-[65%]",
          block.align === "left"
            ? "me-auto ms-0"
            : block.align === "right"
              ? "ms-auto me-0"
              : "mx-auto",
        )
      : undefined;

  return (
    <div
      className={cn(
        "group relative rounded-xl border-2 transition-colors",
        selected ? "border-primary" : "border-transparent hover:border-border",
        isDragging && "z-10",
        fitAlignClass,
      )}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      ref={(node) => {
        blockElRef.current = node;
        setNodeRef(node);
      }}
      style={style}
    >
      {!isTitle && (
      <div
        className={cn(
          "absolute bottom-full start-0 z-20 mb-1.5 flex-row items-center gap-0.5 rounded-lg border bg-background p-0.5 shadow-xs transition-opacity lg:bottom-auto lg:-start-6 lg:top-1/2 lg:mb-0 lg:-translate-y-1/2 lg:flex lg:flex-col lg:border-0 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100",
          selected ? "flex" : "hidden",
        )}
      >
        <Button
          aria-label={t("Geser blok")}
          className="cursor-grab text-muted-foreground"
          size="icon-xs"
          type="button"
          variant="ghost"
          {...attributes}
          {...listeners}
        >
          <EllipsisVerticalIcon className="size-4" />
        </Button>
        <button
          aria-label={t("Hapus blok")}
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-destructive outline-none transition-colors hover:text-destructive/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background sm:size-6"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <TrashIcon className="size-4" />
        </button>
      </div>
      )}

      <CanvasBlockContent
        autoFocus={autoFocus}
        block={block}
        onChange={onChange}
        onAutoFocusDone={onAutoFocusDone}
        onFormatStateChange={onFormatStateChange}
        onSelectPhoto={onSelect}
        registerTextHandle={registerTextHandle}
      />
    </div>
  );
}

function fitClass(fit: ProjectBlockFit | null | undefined) {
  return (fit ?? "fill") === "fit" ? "object-contain" : "object-cover";
}

function CanvasBlockContent({
  block,
  onChange,
  autoFocus,
  onAutoFocusDone,
  onSelectPhoto,
  registerTextHandle,
  onFormatStateChange,
}: {
  block: ProjectBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  onSelectPhoto?: (photoIndex: number) => void;
  registerTextHandle?: (handle: RichTextHandle | null) => void;
  onFormatStateChange?: () => void;
}) {
  if (block.type === "heading") {
    return (
      <HeadingBlock
        autoFocus={autoFocus}
        onChange={(text) => onChange({ text })}
        onAutoFocusDone={onAutoFocusDone}
        value={block.text}
      />
    );
  }

  if (block.type === "image" || block.type === "video") {
    return (
      <div className="space-y-1.5">
        <BlockMediaField
          autoOpen={autoFocus && !block.url}
          fit={block.fit}
          kind={block.type}
          onChange={(url) => onChange({ url })}
          onAutoOpenDone={onAutoFocusDone}
          value={block.url}
        />
        {block.caption?.trim() ? (
          <p className="px-2 text-center text-sm text-muted-foreground">{block.caption}</p>
        ) : null}
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <CanvasTextBlock
        autoFocus={autoFocus}
        block={block}
        onChange={onChange}
        onAutoFocusDone={onAutoFocusDone}
        onFormatStateChange={onFormatStateChange}
        registerHandle={registerTextHandle}
      />
    );
  }

  if (block.type === "gallery") {
    return (
      <CanvasGalleryBlock
        autoFocus={autoFocus}
        block={block}
        onChange={onChange}
        onAutoFocusDone={onAutoFocusDone}
        onSelectPhoto={onSelectPhoto}
      />
    );
  }

  return <CanvasLinkBlock autoFocus={autoFocus} block={block} onChange={onChange} onAutoFocusDone={onAutoFocusDone} />;
}

function CanvasLinkBlock({
  block,
  onChange,
  autoFocus,
  onAutoFocusDone,
}: {
  block: ProjectLinkBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
}) {
  const labelRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!autoFocus) return;
    labelRef.current?.focus();
    onAutoFocusDone?.();
  }, [autoFocus, onAutoFocusDone]);

  const logo = logoFromUrl(block.url);

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border bg-background">
        {logo ? (
          <img alt="" className="size-5 object-contain" src={logo} />
        ) : (
          <LinkIcon className="size-4 text-muted-foreground" />
        )}
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <input
          aria-label={t("Label tautan")}
          className="w-full border-0 bg-transparent p-0 font-medium text-foreground outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={t("Label")}
          ref={labelRef}
          value={block.label ?? ""}
        />
        <input
          aria-label={t("URL tautan")}
          className="w-full border-0 bg-transparent p-0 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50"
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://github.com/..."
          value={block.url}
        />
      </div>
    </div>
  );
}

function CanvasTextBlock({
  block,
  onChange,
  autoFocus,
  onAutoFocusDone,
  registerHandle,
  onFormatStateChange,
}: {
  block: ProjectTextBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  registerHandle?: (handle: RichTextHandle | null) => void;
  onFormatStateChange?: () => void;
}) {
  return (
    <div className="min-w-0 px-2 py-1">
      <RichTextBlock
        autoFocus={autoFocus}
        className="w-full text-base leading-relaxed text-foreground [&:empty]:before:text-muted-foreground [&:empty]:before:content-['Teks']"
        onChange={(html) => onChange({ text: html })}
        onAutoFocusDone={onAutoFocusDone}
        onFormatStateChange={onFormatStateChange}
        registerHandle={registerHandle}
        value={block.text}
      />
    </div>
  );
}

function CanvasGalleryBlock({
  block,
  onChange,
  autoFocus,
  onAutoFocusDone,
  onSelectPhoto,
}: {
  block: ProjectGalleryBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
  autoFocus?: boolean;
  onAutoFocusDone?: () => void;
  onSelectPhoto?: (photoIndex: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const { t } = useLanguage();

  useEffect(() => {
    if (autoFocus && block.images.length === 0 && inputRef.current) {
      inputRef.current.click();
      onAutoFocusDone?.();
    }
  }, [autoFocus, block.images.length, onAutoFocusDone]);

  function handleFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    if (list.length === 0) return;
    const added: ProjectGalleryItem[] = [];
    for (const file of list) {
      const validation = validateUpload(file);
      if (!validation.ok) {
        toastManager.add({
          title: t("Gagal memilih {name}", { name: file.name }),
          description: validation.message,
          type: "error",
        });
        continue;
      }
      if (!file.type.startsWith("image/")) continue;
      const url = URL.createObjectURL(file);
      registerLocalFile(url, file);
      added.push({ url });
    }
    if (added.length > 0) onChange({ images: [...block.images, ...added] });
  }

  return (
    <div
      className={cn(
        "rounded-xl transition-colors",
        dragging && "bg-accent/40",
      )}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      {block.images.length > 0 ? (
        <div className="flex min-w-0 gap-2 overflow-x-auto pb-1">
          {block.images.map((image, index) => (
            <button
              className="relative w-40 shrink-0 cursor-pointer overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                onSelectPhoto?.(index);
              }}
              type="button"
            >
              <img
                alt={image.caption ?? ""}
                className="aspect-video w-full object-cover"
                src={image.url}
              />
            </button>
          ))}
        </div>
      ) : (
        <div
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
            dragging ? "border-primary bg-accent" : "border-input hover:bg-accent/50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
          role="button"
          tabIndex={0}
        >
          <PhotoIcon className="size-5 text-muted-foreground" />
          <p className="font-medium text-sm">{t("Unggah gambar")}</p>
          <p className="text-muted-foreground text-xs">{t("PNG/JPG/WEBP/GIF — maks 5MB")}</p>
        </div>
      )}
      <input
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        multiple
        onChange={(event) => {
          const files = event.target.files ? Array.from(event.target.files) : [];
          event.target.value = "";
          handleFiles(files);
        }}
        ref={inputRef}
        type="file"
      />
    </div>
  );
}

function settingsBlockTitle(block: ProjectBlock): string {
  if (block.type === "video") return translate("Pengaturan Video");
  if (block.type === "gallery") return translate("Pengaturan Galeri");
  if (block.type === "text") return translate("Pengaturan Teks");
  return translate("Pengaturan Gambar");
}

function EditorSidebar({
  projectTab,
  settingsBlock,
  textHandle,
  textFormatVersion,
  editing,
  categories,
  onChangeProject,
  onChangeBlock,
  onClose,
}: {
  projectTab: "category" | "period" | "tech" | null;
  settingsBlock: ProjectBlock | null;
  textHandle: RichTextHandle | null;
  textFormatVersion: number;
  editing: ProjectForm;
  categories: string[];
  onChangeProject: (patch: Partial<ProjectForm>) => void;
  onChangeBlock: (patch: Partial<ProjectBlock>) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const heading = projectTab
    ? projectTabLabel(projectTab)
    : settingsBlock
      ? settingsBlockTitle(settingsBlock)
      : "";

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-base">{heading}</h2>
        <Button
          aria-label={t("Tutup panel")}
          className="text-muted-foreground"
          onClick={onClose}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <XMarkIcon />
        </Button>
      </div>
      {projectTab ? (
        <ProjectDataPanel
          categories={categories}
          editing={editing}
          onChange={onChangeProject}
          tab={projectTab}
        />
      ) : settingsBlock?.type === "text" ? (
        <TextBlockProperties formatVersion={textFormatVersion} handle={textHandle} />
      ) : settingsBlock ? (
        <MediaBlockProperties block={settingsBlock} onChange={onChangeBlock} />
      ) : null}
    </div>
  );
}

function TextBlockProperties({
  handle,
  formatVersion,
}: {
  handle: RichTextHandle | null;
  formatVersion: number;
}) {
  const { t } = useLanguage();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  void formatVersion;
  const format = handle?.getFormatState() ?? {
    bold: false,
    italic: false,
    underline: false,
    unorderedList: false,
    orderedList: false,
  };

  function applyLink() {
    const trimmed = linkUrl.trim();
    if (!trimmed) return;
    const normalized =
      /^https?:\/\//i.test(trimmed) || trimmed.startsWith("mailto:")
        ? trimmed
        : `https://${trimmed}`;
    handle?.insertLink(normalized);
    setLinkUrl("");
    setLinkOpen(false);
  }

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap items-center justify-center gap-2"
        onMouseDown={(event) => event.preventDefault()}
      >
        <Button
          aria-label={t("Tebal")}
          aria-pressed={format.bold}
          className="size-11 [&_svg]:size-5"
          onClick={() => handle?.exec("bold")}
          size="icon"
          title={t("Tebal")}
          type="button"
          variant={format.bold ? "default" : "outline"}
        >
          <BoldIcon />
        </Button>
        <Button
          aria-label={t("Miring")}
          aria-pressed={format.italic}
          className="size-11 [&_svg]:size-5"
          onClick={() => handle?.exec("italic")}
          size="icon"
          title={t("Miring")}
          type="button"
          variant={format.italic ? "default" : "outline"}
        >
          <ItalicIcon />
        </Button>
        <Button
          aria-label={t("Garis bawah")}
          aria-pressed={format.underline}
          className="size-11 [&_svg]:size-5"
          onClick={() => handle?.exec("underline")}
          size="icon"
          title={t("Garis bawah")}
          type="button"
          variant={format.underline ? "default" : "outline"}
        >
          <UnderlineIcon />
        </Button>

        <span className="mx-0.5 h-6 w-px bg-border" />

        <Button
          aria-label={t("Daftar poin")}
          aria-pressed={format.unorderedList}
          className="size-11 [&_svg]:size-5"
          onClick={() => handle?.toggleList("insertUnorderedList")}
          size="icon"
          title={t("Daftar poin")}
          type="button"
          variant={format.unorderedList ? "default" : "outline"}
        >
          <ListBulletIcon />
        </Button>
        <Button
          aria-label={t("Daftar angka")}
          aria-pressed={format.orderedList}
          className="size-11 [&_svg]:size-5"
          onClick={() => handle?.toggleList("insertOrderedList")}
          size="icon"
          title={t("Daftar angka")}
          type="button"
          variant={format.orderedList ? "default" : "outline"}
        >
          <NumberedListIcon />
        </Button>

        <span className="mx-0.5 h-6 w-px bg-border" />

        <Button
          aria-label={t("Tautan")}
          aria-pressed={linkOpen}
          className="size-11 [&_svg]:size-5"
          onClick={() => setLinkOpen((v) => !v)}
          size="icon"
          title={t("Tautan")}
          type="button"
          variant={linkOpen ? "default" : "outline"}
        >
          <LinkIcon />
        </Button>
      </div>

      {linkOpen && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://…"
            value={linkUrl}
          />
          <Button
            aria-label={t("Sisipkan")}
            className="size-10 shrink-0 [&_svg]:size-5"
            disabled={!linkUrl.trim()}
            onClick={applyLink}
            onMouseDown={(event) => event.preventDefault()}
            size="icon"
            title={t("Sisipkan")}
            type="button"
            variant="outline"
          >
            <CheckIcon />
          </Button>
        </div>
      )}
    </div>
  );
}

function ProjectDataPanel({
  tab,
  editing,
  categories,
  onChange,
}: {
  tab: "category" | "period" | "tech";
  editing: ProjectForm;
  categories: string[];
  onChange: (patch: Partial<ProjectForm>) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      {tab === "category" && (
        <Autocomplete
          items={categories}
          onValueChange={(value) => onChange({ category: value })}
          value={editing.category}
        >
          <AutocompleteInput placeholder={t("Kategori")} />
          <AutocompletePopup>
            <AutocompleteEmpty>{t("Tidak ditemukan.")}</AutocompleteEmpty>
            <AutocompleteList>
              {(item: string) => (
                <AutocompleteItem key={item} value={item}>
                  {item}
                </AutocompleteItem>
              )}
            </AutocompleteList>
          </AutocompletePopup>
        </Autocomplete>
      )}

      {tab === "tech" && (
        <Combobox
          items={TECH_OPTIONS}
          multiple
          onValueChange={(next) => onChange({ tech_stacks: next as string[] })}
          value={editing.tech_stacks}
        >
          <ComboboxChips>
            <ComboboxValue>
              {(value: string[]) => (
                <>
                  {value.map((tech) => (
                    <ComboboxChip key={tech}>{tech}</ComboboxChip>
                  ))}
                  <ComboboxChipsInput placeholder={t("Teknologi")} />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxPopup>
            <ComboboxEmpty>{t("Tidak ditemukan.")}</ComboboxEmpty>
            <ComboboxList>
              {(item: string) => (
                <ComboboxItem key={item} value={item}>
                  <span className="flex items-center gap-2">
                    <TechLogoPreview name={item} />
                    {item}
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      )}

      {tab === "period" && (
        <div className="space-y-3">
          <MonthYearRange
            endLabel={t("Sekarang")}
            hideEnd={isOngoingPeriod(editing.date_range)}
            onChange={(value) =>
              onChange({
                date_range:
                  isOngoingPeriod(editing.date_range) && value.trim()
                    ? `${value.trim()} - Now`
                    : value,
              })
            }
            value={
              isOngoingPeriod(editing.date_range)
                ? periodStart(editing.date_range)
                : editing.date_range
            }
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={isOngoingPeriod(editing.date_range)}
              onCheckedChange={(checked) =>
                onChange({
                  date_range: checked
                    ? `${periodStart(editing.date_range)} - Now`
                    : periodStart(editing.date_range),
                })
              }
            />
            {t("Sedang mengerjakan proyek ini")}
          </label>
        </div>
      )}
    </div>
  );
}

function GallerySettingsOverlay({
  block,
  initialIndex,
  onChange,
  onClose,
}: {
  block: ProjectGalleryBlock;
  initialIndex: number;
  onChange: (patch: Partial<ProjectBlock>) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(block.images.length - 1, 0)),
  );

  useEffect(() => {
    const safe = Math.min(Math.max(initialIndex, 0), Math.max(block.images.length - 1, 0));
    setCurrent(safe);
    const frame = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (track) track.scrollTo({ left: safe * track.clientWidth, behavior: "instant" });
    });
    return () => cancelAnimationFrame(frame);
    // Hanya saat overlay dibuka atau initialIndex berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIndex]);

  const safeCurrent = Math.min(Math.max(current, 0), Math.max(block.images.length - 1, 0));
  const activeImage = block.images[safeCurrent];

  function goTo(target: number) {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(block.images.length - 1, target));
    setCurrent(next);
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  function handleReplaceFile(files: FileList | File[] | null) {
    const file = files ? Array.from(files)[0] : undefined;
    if (!file) return;
    const validation = validateUpload(file);
    if (!validation.ok) {
      toastManager.add({
        title: t("Gagal memilih {name}", { name: file.name }),
        description: validation.message,
        type: "error",
      });
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    registerLocalFile(url, file);
    const next = block.images.map((item, i) =>
      i === safeCurrent ? { ...item, url } : item,
    );
    onChange({ images: next });
  }

  function handleDeleteCurrent() {
    const next = block.images.filter((_, i) => i !== safeCurrent);
    onChange({ images: next });
    if (next.length === 0) {
      onClose();
      return;
    }
    const nextIndex = Math.min(safeCurrent, next.length - 1);
    setCurrent(nextIndex);
    requestAnimationFrame(() => {
      const track = trackRef.current;
      if (track) track.scrollTo({ left: nextIndex * track.clientWidth, behavior: "instant" });
    });
  }

  const navButton =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25 disabled:pointer-events-none disabled:opacity-0 md:grid";

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogPortal>
        <DialogBackdrop
          className="bg-black/80 backdrop-blur-xl [-webkit-backdrop-filter:blur(24px)]"
          forceRender
        />
        <DialogPrimitive.Popup
          aria-label={t("Pengaturan Galeri")}
          className="fixed inset-0 z-50 flex flex-col outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          onKeyDown={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
            if (event.key === "ArrowLeft") goTo(safeCurrent - 1);
            if (event.key === "ArrowRight") goTo(safeCurrent + 1);
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <span className="font-medium text-sm tabular-nums">
              {safeCurrent + 1} / {block.images.length}
            </span>
            <DialogPrimitive.Close
              aria-label={t("Tutup panel")}
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25"
            >
              <XMarkIcon className="size-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                const track = event.currentTarget;
                if (track.clientWidth > 0) {
                  setCurrent(Math.round(track.scrollLeft / track.clientWidth));
                }
              }}
              ref={trackRef}
            >
              {block.images.map((image, i) => (
                <div
                  className="flex size-full shrink-0 snap-center items-center justify-center px-4 py-2 sm:px-16"
                  key={`${image.url}-${i}`}
                >
                  <img
                    alt={image.caption ?? ""}
                    className="max-h-full max-w-full rounded-xl object-contain"
                    src={image.url}
                  />
                </div>
              ))}
            </div>

            {block.images.length > 1 && (
              <>
                <button
                  aria-label={t("Foto sebelumnya")}
                  className={cn(navButton, "left-4")}
                  disabled={safeCurrent === 0}
                  onClick={() => goTo(safeCurrent - 1)}
                  type="button"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
                <button
                  aria-label={t("Foto berikutnya")}
                  className={cn(navButton, "right-4")}
                  disabled={safeCurrent === block.images.length - 1}
                  onClick={() => goTo(safeCurrent + 1)}
                  type="button"
                >
                  <ChevronRightIcon className="size-5" />
                </button>
              </>
            )}
          </div>

          <div className="mx-auto w-full max-w-xl space-y-3 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)_+_1rem)] sm:px-6">
            {block.images.length > 1 && (
              <div className="flex justify-center gap-1.5">
                {block.images.map((image, i) => (
                  <button
                    aria-label={`${t("Foto")} ${i + 1}`}
                    className={cn(
                      "h-1.5 cursor-pointer rounded-full transition-all",
                      i === safeCurrent ? "w-5 bg-white" : "w-1.5 bg-white/40",
                    )}
                    key={`${image.url}-${i}`}
                    onClick={() => goTo(i)}
                    type="button"
                  />
                ))}
              </div>
            )}

            {activeImage && (
              <div className="space-y-2.5 rounded-2xl border border-white/15 bg-background/95 p-3 shadow-lg backdrop-blur-md">
                <Input
                  aria-label={t("Keterangan")}
                  onChange={(e) => {
                    const next = block.images.map((item, i) =>
                      i === safeCurrent ? { ...item, caption: e.target.value } : item,
                    );
                    onChange({ images: next });
                  }}
                  placeholder={t("Tulis keterangan…")}
                  size="sm"
                  value={activeImage.caption ?? ""}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="w-full"
                    onClick={() => replaceInputRef.current?.click()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <ArrowUpTrayIcon />
                    {t("Ganti gambar")}
                  </Button>
                  <Button
                    aria-label={t("Hapus gambar")}
                    className="w-full"
                    onClick={handleDeleteCurrent}
                    size="sm"
                    type="button"
                    variant="destructive-outline"
                  >
                    <TrashIcon />
                    {t("Hapus")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(event) => {
              const files = event.target.files ? Array.from(event.target.files) : [];
              event.target.value = "";
              handleReplaceFile(files);
            }}
            ref={replaceInputRef}
            type="file"
          />
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}

function MediaBlockProperties({
  block,
  onChange,
}: {
  block: ProjectBlock;
  onChange: (patch: Partial<ProjectBlock>) => void;
}) {
  const { t } = useLanguage();
  const mediaInputRef = useRef<HTMLInputElement>(null);

  if (block.type !== "image" && block.type !== "video") return null;

  const fit: ProjectBlockFit = block.fit ?? "fill";
  const align: ProjectBlockAlign = block.align ?? "center";
  const accept =
    block.type === "image"
      ? "image/png,image/jpeg,image/webp,image/gif"
      : "video/mp4,video/webm,video/quicktime";

  function handleMediaFile(files: FileList | File[] | null) {
    const file = files ? Array.from(files)[0] : undefined;
    if (!file) return;
    const validation = validateUpload(file);
    if (!validation.ok) {
      toastManager.add({
        title: t("Gagal memilih file"),
        description: validation.message,
        type: "error",
      });
      return;
    }
    const url = URL.createObjectURL(file);
    registerLocalFile(url, file);
    onChange({ url });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pb-4">
        <Field className="flex-row items-center justify-between gap-3">
          <FieldLabel>{t("Tampilan")}</FieldLabel>
          <div
            aria-label={t("Mode tampilan media")}
            className={cn(segmentedControlRootClassName, "inline-grid grid-cols-2")}
            data-base-ui-swipe-ignore
            role="group"
          >
            {(
              [
                { value: "fill", label: t("Penuh"), Icon: ArrowsPointingOutIcon },
                { value: "fit", label: t("Pas"), Icon: ArrowsPointingInIcon },
              ] as const
            ).map(({ value, label, Icon }) => (
              <button
                aria-label={label}
                aria-pressed={fit === value}
                className={cn(
                  segmentedControlItemVariants({ size: "lg", state: "checked" }),
                  "h-10 min-w-11 touch-manipulation justify-center px-3 sm:h-8 sm:min-w-9 sm:px-2.5",
                )}
                data-checked={fit === value ? "" : undefined}
                key={value}
                onClick={() => onChange({ fit: value })}
                title={label}
                type="button"
              >
                <Icon className="size-5 sm:size-4" />
              </button>
            ))}
          </div>
        </Field>

        {fit === "fit" && (
          <Field className="flex-row items-center justify-between gap-3">
            <FieldLabel>{t("Posisi")}</FieldLabel>
            <div
              aria-label={t("Posisi")}
              className={cn(segmentedControlRootClassName, "inline-grid grid-cols-3")}
              data-base-ui-swipe-ignore
              role="group"
            >
              {(
                [
                  { value: "left", label: t("Kiri"), Icon: Bars3BottomLeftIcon },
                  { value: "center", label: t("Tengah"), Icon: Bars3Icon },
                  { value: "right", label: t("Kanan"), Icon: Bars3BottomRightIcon },
                ] as const
              ).map(({ value, label, Icon }) => (
                <button
                  aria-label={label}
                  aria-pressed={align === value}
                  className={cn(
                    segmentedControlItemVariants({ size: "lg", state: "checked" }),
                    "h-10 min-w-11 touch-manipulation justify-center px-3 sm:h-8 sm:min-w-9 sm:px-2.5",
                  )}
                  data-checked={align === value ? "" : undefined}
                  key={value}
                  onClick={() => onChange({ align: value })}
                  title={label}
                  type="button"
                >
                  <Icon className="size-5 sm:size-4" />
                </button>
              ))}
            </div>
          </Field>
        )}

        <Field>
          <FieldLabel>{t("Keterangan")}</FieldLabel>
          <Input
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder={t("Tulis keterangan…")}
            value={block.caption ?? ""}
          />
        </Field>

        {block.type === "video" && (
          <Field>
            <FieldLabel>URL</FieldLabel>
            <Input
              onChange={(e) => onChange({ url: e.target.value })}
              placeholder={t("URL YouTube/Vimeo")}
              value={block.url}
            />
          </Field>
        )}
      </div>

      <div className={cn("grid shrink-0 gap-2 border-t pt-3", block.url ? "grid-cols-2" : "grid-cols-1")}>
        <Button
          className="w-full"
          onClick={() => mediaInputRef.current?.click()}
          size="sm"
          type="button"
          variant="outline"
        >
          <ArrowUpTrayIcon />
          {block.url
            ? t("Ganti media")
            : block.type === "image"
              ? t("Unggah gambar")
              : t("Unggah video")}
        </Button>
        {block.url && (
          <Button
            aria-label={t("Hapus media")}
            className="w-full"
            onClick={() => onChange({ url: "" })}
            size="sm"
            type="button"
            variant="destructive-outline"
          >
            <TrashIcon />
            {t("Hapus")}
          </Button>
        )}
        <input
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const files = event.target.files ? Array.from(event.target.files) : [];
            event.target.value = "";
            handleMediaFile(files);
          }}
          ref={mediaInputRef}
          type="file"
        />
      </div>
    </div>
  );
}

function BlockMediaField({
  kind,
  value,
  fit,
  onChange,
  autoOpen,
  onAutoOpenDone,
}: {
  kind: "image" | "video";
  value: string;
  fit?: ProjectBlockFit | null;
  onChange: (url: string) => void;
  autoOpen?: boolean;
  onAutoOpenDone?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (autoOpen && !value && inputRef.current) {
      inputRef.current.click();
      onAutoOpenDone?.();
    }
  }, [autoOpen, value, onAutoOpenDone]);

  function handleFiles(files: FileList | File[] | null) {
    const list = files ? Array.from(files) : [];
    const file = list[0];
    if (!file) return;

    const validation = validateUpload(file);
    if (!validation.ok) {
      toastManager.add({
        title: t("Gagal memilih file"),
        description: validation.message,
        type: "error",
      });
      return;
    }

    const url = URL.createObjectURL(file);
    registerLocalFile(url, file);
    onChange(url);
  }

  const accept =
    kind === "image"
      ? "image/png,image/jpeg,image/webp,image/gif"
      : "video/mp4,video/webm,video/quicktime";

  const picker = (
    <input
      accept={accept}
      className="hidden"
      onChange={(event) => {
        const files = event.target.files ? Array.from(event.target.files) : [];
        event.target.value = "";
        handleFiles(files);
      }}
      ref={inputRef}
      type="file"
    />
  );

  if (value) {
    const embed = kind === "video" ? toEmbedUrl(value) : null;
    return (
      <div className="relative">
        {kind === "image" ? (
          <img
            alt=""
            className={cn(
              "rounded-lg border",
              fit === "fit"
                ? "block h-auto max-h-64 w-auto max-w-full object-contain"
                : "aspect-video w-full object-cover",
            )}
            src={value}
          />
        ) : embed ? (
          <iframe
            allowFullScreen
            className="aspect-video w-full rounded-lg border"
            src={embed}
            title="Video"
          />
        ) : (
          <video
            className={cn(
              "aspect-video w-full rounded-lg border bg-black",
              fitClass(fit),
            )}
            controls
            src={value}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
        dragging ? "border-primary bg-accent" : "border-input hover:bg-accent/50",
      )}
      onClick={() => inputRef.current?.click()}
      onDragLeave={() => setDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
    >
      {kind === "image" ? (
        <PhotoIcon className="size-5 text-muted-foreground" />
      ) : (
        <VideoCameraIcon className="size-5 text-muted-foreground" />
      )}
      <p className="font-medium text-sm">
        {kind === "image" ? t("Unggah gambar") : t("Unggah video")}
      </p>
      <p className="text-muted-foreground text-xs">
        {kind === "image"
          ? t("PNG/JPG/WEBP/GIF — maks 5MB")
          : t("MP4/WEBM/MOV — maks 50MB, atau tempel URL di bawah")}
      </p>
      {picker}
    </div>
  );
}

function StatusBadge({ isPublished }: { isPublished: boolean }) {
  const { t } = useLanguage();
  return (
    <span
      className={
        isPublished
          ? "inline-flex shrink-0 items-center rounded-full bg-success/80 px-2 py-0.5 font-medium text-[10px] text-white backdrop-blur-sm"
          : "inline-flex shrink-0 items-center rounded-full bg-orange-500/50 px-2 py-0.5 font-medium text-[10px] text-white backdrop-blur-sm"
      }
    >
      {isPublished ? t("Terbit") : t("Draf")}
    </span>
  );
}

function TechLogoPreview({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  if (!logo || failed) return null;

  return (
    <span className="grid size-5 shrink-0 place-items-center rounded border bg-white">
      <img
        alt=""
        className="size-4 object-contain"
        onError={() => setFailed(true)}
        src={logo}
      />
    </span>
  );
}
