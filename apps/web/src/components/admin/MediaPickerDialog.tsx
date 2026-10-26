import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpTrayIcon, DocumentTextIcon, EyeIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { UploadedFile } from "@portofolio/shared";
import { formatUploadSize, maxUploadSize, validateUpload } from "@portofolio/shared";
import { apiGet, apiSend, apiUpload } from "@/lib/api";
import { optimizeImageFile } from "@/lib/optimize-image";
import { cn, formatBytes, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toastManager } from "@/components/ui/toast";
import {
  Dialog,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { useLanguage } from "@/lib/language";
import { EmptyBoxIllustration } from "@/components/EmptyBoxIllustration";

interface MediaPickerDialogProps {
  open: boolean;
  kind: "image" | "file";
  /** URL yang sedang dipakai (single) atau daftar URL yang sedang dipakai (multi). */
  current?: string | string[];
  scope?: string;
  onSelect?: (url: string) => void;
  /**
   * Mode multi-pilih: pengguna bisa menandai beberapa file sekaligus (dari
   * riwayat upload maupun upload baru) lalu memakainya sekaligus lewat
   * `onSelectMany`.
   */
  multiple?: boolean;
  onSelectMany?: (urls: string[]) => void;
  /**
   * When provided, a newly chosen file is handed back instead of being
   * uploaded right away, so callers can transform it (e.g. crop) first and
   * upload only the result. Existing library files still go through
   * `onSelect` with their URL.
   */
  onPickFile?: (file: File) => void;
  onClose: () => void;
}

const ACCEPT_BY_KIND: Record<"image" | "file", string> = {
  image: "image/png,image/jpeg,image/webp,image/gif",
  file: "application/pdf",
};

export default function MediaPickerDialog({
  open,
  kind,
  current,
  scope,
  onSelect,
  onPickFile,
  onClose,
  multiple = false,
  onSelectMany,
}: MediaPickerDialogProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"browse" | "preview">("browse");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<UploadedFile | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const scopeQuery = scope ? `&scope=${encodeURIComponent(scope)}` : "";

  const history = useQuery({
    queryKey: ["admin", "uploads", kind, scope],
    queryFn: () => apiGet<UploadedFile[]>(`/admin/uploads?type=${kind}${scopeQuery}`),
    enabled: open,
  });

  // Refresh the history whenever the picker opens so the "Dipakai" badge
  // reflects files that were saved since the last time it was shown.
  useEffect(() => {
    if (open) {
      queryClient.invalidateQueries({ queryKey: ["admin", "uploads"] });
    }
  }, [open, queryClient]);

  const removeMutation = useMutation({
    mutationFn: (name: string) =>
      apiSend("DELETE", `/admin/uploads?name=${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "uploads"] });
      toastManager.add({
        title: t("File dihapus"),
        description: t("File berhasil dihapus dari riwayat."),
        type: "success",
      });
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : t("Gagal menghapus file.");
      setError(message);
      toastManager.add({ title: t("Gagal menghapus"), description: message, type: "error" });
    },
  });

  async function uploadFiles(files: File[]) {
    setError(null);

    const validFiles: File[] = [];
    for (const file of files) {
      const validation = validateUpload(file);
      if (!validation.ok) {
        const message = validation.message;
        setError(message);
        toastManager.add({ title: t("Gagal mengunggah"), description: message, type: "error" });
      } else {
        validFiles.push(file);
      }
    }
    if (validFiles.length === 0) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of validFiles) {
        const optimized = kind === "image" ? await optimizeImageFile(file) : file;
        const data = await apiUpload<{ url: string }>(
          `/admin/uploads${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
          optimized,
        );
        urls.push(data.url);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "uploads"] });
      if (multiple) {
        toastManager.add({
          title: t("Berhasil diunggah"),
          description:
            urls.length > 1 ? t("{count} file berhasil diunggah.", { count: urls.length }) : t("File berhasil diunggah."),
          type: "success",
        });
        setSelected((prev) => [...prev, ...urls]);
      } else {
        toastManager.add({
          title: t("Berhasil diunggah"),
          description: t("File berhasil diunggah."),
          type: "success",
        });
        onSelect?.(urls[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Gagal mengunggah file.");
      setError(message);
      toastManager.add({ title: t("Gagal mengunggah"), description: message, type: "error" });
    } finally {
      setUploading(false);
    }
  }

  function processFile(file: File) {
    // Hand the raw file back when the caller needs to transform it first.
    if (onPickFile) {
      onPickFile(file);
      return;
    }
    void uploadFiles([file]);
  }

  function toggleSelected(url: string) {
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url],
    );
  }

  function handleSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;
    if (multiple) {
      void uploadFiles(files);
    } else {
      processFile(files[0]);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (uploading) return;
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length === 0) return;
    if (multiple) {
      void uploadFiles(files);
    } else {
      processFile(files[0]);
    }
  }

  return (
    <Dialog
      onOpenChange={(next) => {
        if (next) return;
        // Closing the preview returns to the file picker instead of closing the dialog.
        if (mode === "preview") {
          setMode("browse");
          setPreview(null);
          return;
        }
        setMode("browse");
        setPreview(null);
        setSelected([]);
        onClose();
      }}
      open={open}
    >
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>
            {mode === "preview"
              ? kind === "image"
                ? t("Pratinjau Foto")
                : t("Pratinjau File")
              : kind === "image"
                ? t("Pilih Foto")
                : t("Pilih File")}
          </DialogTitle>
        </DialogHeader>

          {mode === "preview" && preview ? (
            <>
              <DialogPanel className="space-y-3">
                {kind === "image" ? (
                  <img
                    alt={t("Pratinjau")}
                    className="mx-auto max-h-[70vh] w-auto rounded-lg border object-contain"
                    src={preview.url}
                  />
                ) : (
                  <iframe
                    className="h-[70vh] w-full rounded-lg border"
                    src={preview.url}
                    title={t("Pratinjau file")}
                  />
                )}
              </DialogPanel>
            </>
          ) : (
            <>
              <DialogPanel className="space-y-4">
                <div
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors",
                    dragging ? "border-primary bg-accent" : "border-input hover:bg-accent/50",
                  )}
                  onClick={() => !uploading && inputRef.current?.click()}
                  onDragLeave={() => setDragging(false)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                >
                  {uploading ? (
                    <Spinner className="size-6 text-muted-foreground" />
                  ) : (
                    <ArrowUpTrayIcon className="size-6 text-muted-foreground" />
                  )}
                  <p className="font-medium text-sm">
                    {uploading
                      ? t("Mengunggah…")
                      : kind === "image"
                        ? t("Unggah foto baru")
                        : t("Unggah file baru")}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {kind === "image"
                      ? t("PNG, JPG, WEBP, atau GIF — maks {size}", { size: formatUploadSize(maxUploadSize("image/png")) })
                      : t("PDF — maks {size}", { size: formatUploadSize(maxUploadSize("application/pdf")) })}
                    {multiple ? t(" — bisa pilih beberapa sekaligus.") : ""}
                  </p>
                </div>

                {error && <p className="text-destructive-foreground text-xs">{error}</p>}

                <div>
                  <p className="mb-2 font-medium text-sm">{t("Riwayat Unggahan")}</p>
                  {history.isLoading ? (
                    <div className="grid place-items-center py-8">
                      <Spinner className="size-5 text-muted-foreground" />
                    </div>
                  ) : !history.data || history.data.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-center">
                      <EmptyBoxIllustration className="size-16 opacity-60" />
                      <p className="text-muted-foreground text-sm">{t("Belum ada riwayat unggahan.")}</p>
                    </div>
                  ) : (
                    <div className="max-h-64 space-y-1 overflow-y-auto">
                      {history.data.map((file) => {
                        const isSelected = multiple
                          ? selected.includes(file.url)
                          : current === file.url;
                        return (
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2 transition-colors",
                            isSelected ? "border-primary bg-accent/50" : "hover:bg-accent",
                          )}
                          key={file.name}
                        >
                          {multiple && (
                            <Checkbox
                              checked={selected.includes(file.url)}
                              onCheckedChange={() => toggleSelected(file.url)}
                            />
                          )}
                          <button
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                            onClick={() => {
                              if (multiple) {
                                toggleSelected(file.url);
                              } else {
                                onSelect?.(file.url);
                              }
                            }}
                            type="button"
                          >
                            {kind === "image" ? (
                              <img
                                alt=""
                                className="size-10 shrink-0 rounded-md border object-cover"
                                src={file.url}
                              />
                            ) : (
                              <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted">
                                <DocumentTextIcon className="size-5 text-muted-foreground" />
                              </span>
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="block truncate font-medium text-sm">
                                  {file.name.split("/").pop()}
                                </span>
                                {file.in_use && (
                                  <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 font-medium text-[10px] text-muted-foreground">
                                    {t("Dipakai")}
                                  </span>
                                )}
                              </span>
                              <span className="block text-muted-foreground text-xs">
                                {formatBytes(file.size)} · {formatDate(file.created_at)}
                              </span>
                            </span>
                          </button>
                          <Button
                            aria-label={t("Pratinjau file")}
                            onClick={() => {
                              setPreview(file);
                              setMode("preview");
                            }}
                            size="icon-sm"
                            type="button"
                            variant="ghost"
                          >
                            <EyeIcon />
                          </Button>
                          <Button
                            aria-label={file.in_use ? t("File sedang dipakai") : t("Hapus file")}
                            disabled={removeMutation.isPending || file.in_use}
                            onClick={() => removeMutation.mutate(file.name)}
                            size="icon-sm"
                            title={
                              file.in_use ? t("File sedang dipakai dan tidak bisa dihapus") : undefined
                            }
                            type="button"
                            variant="destructive-outline"
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {multiple && selected.length > 0 && (
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      onClick={() => setSelected([])}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      {t("Bersihkan")}
                    </Button>
                    <Button
                      onClick={() => {
                        onSelectMany?.(selected);
                        setSelected([]);
                        onClose();
                      }}
                      size="sm"
                      type="button"
                    >
                      {t("Gunakan ({count})", { count: selected.length })}
                    </Button>
                  </div>
                )}
              </DialogPanel>
            </>
          )}

          <input
            accept={ACCEPT_BY_KIND[kind]}
            className="hidden"
            multiple={multiple}
            onChange={handleSelect}
            ref={inputRef}
            type="file"
          />
        </DialogPopup>
    </Dialog>
  );
}
