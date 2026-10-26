import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ArrowUpTrayIcon, PhotoIcon, TrashIcon } from "@heroicons/react/24/outline";
import { validateUpload } from "@portofolio/shared";
import { apiUpload } from "@/lib/api";
import { cropImageToBlob } from "@/lib/crop-image";
import { fileNameFromUrl, truncateFileName } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import { useLanguage } from "@/lib/language";

interface ImageCropUploadProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  scope?: string;
  aspect?: number;
  /** Tampilan ringkas: thumbnail + nama file + tombol aksi ringkas. */
  compact?: boolean;
  /** Jangan turunkan resolusi hasil crop (tetap ukuran piksel asli). */
  preserveSize?: boolean;
}

/** Pick/upload an image, crop it to `aspect`, then upload the cropped result. */
export default function ImageCropUpload({
  value,
  onChange,
  label: rawLabel = "Logo",
  hint,
  scope,
  aspect = 1,
  compact = false,
  preserveSize = false,
}: ImageCropUploadProps) {
  const { t } = useLanguage();
  const label = t(rawLabel);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  // Object URL for a freshly picked local file, revoked when the crop is
  // closed so the picked file is never left in blob storage.
  const localPreviewRef = useRef<string | null>(null);

  const name = value ? fileNameFromUrl(value) : "";
  const lowerLabel = label.toLowerCase();

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  function releaseLocalPreview() {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
  }

  function startCropFromFile(file: File) {
    releaseLocalPreview();
    const preview = URL.createObjectURL(file);
    localPreviewRef.current = preview;
    setSource(preview);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setAreaPixels(null);
  }

  function closeCrop() {
    releaseLocalPreview();
    setSource(null);
  }

  useEffect(() => releaseLocalPreview, []);

  async function handleSave() {
    if (!source || !areaPixels) return;
    setSaving(true);
    try {
      const { blob, mime, extension } = await cropImageToBlob(
        source,
        areaPixels,
        undefined,
        preserveSize ? Number.MAX_SAFE_INTEGER : undefined,
      );
      const file = new File([blob], `${rawLabel.toLowerCase()}-${Date.now()}.${extension}`, {
        type: mime,
      });

      const validation = validateUpload(file);
      if (!validation.ok) {
        toastManager.add({
          title: t("{label} terlalu besar", { label }),
          description: validation.message,
          type: "error",
        });
        return;
      }
      const data = await apiUpload<{ url: string }>(
        `/admin/uploads${scope ? `?scope=${encodeURIComponent(scope)}` : ""}`,
        file,
      );
      onChange(data.url);
      closeCrop();
      toastManager.add({
        title: t("{label} tersimpan", { label }),
        description: t("{label} berhasil dipotong dan diunggah.", { label }),
        type: "success",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("Gagal memotong {label}.", { label: lowerLabel });
      toastManager.add({ title: t("Gagal memotong {label}", { label: lowerLabel }), description: message, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {compact ? (
        <div className="flex w-full min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
            {value ? (
              <img alt="" className="h-full w-full object-cover" src={value} />
            ) : (
              <PhotoIcon className="size-5 text-muted-foreground" />
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>
            {value ? truncateFileName(name) : label}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {value && (
              <Button
                aria-label={t("Hapus {label}", { label })}
                onClick={() => onChange("")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon />
              </Button>
            )}
            <Button
              aria-label={t("Pilih {label}", { label })}
              className="gap-1.5"
              onClick={() => setPickerOpen(true)}
              size="sm"
              title={hint}
              type="button"
              variant="outline"
            >
              <ArrowUpTrayIcon />
              {t("Pilih Foto")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
              {value ? (
                <img alt="" className="h-full w-full object-cover" src={value} />
              ) : (
                <PhotoIcon className="size-5 text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 text-left">
              <p className="text-muted-foreground text-xs">{label}</p>
              {value ? (
                <p className="mt-0.5 truncate font-medium text-sm" title={name}>
                  {truncateFileName(name)}
                </p>
              ) : (
                <p className="mt-0.5 text-muted-foreground text-sm">{t("Belum ada {label} diunggah.", { label: lowerLabel })}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {value && (
              <Button onClick={() => onChange("")} size="sm" type="button" variant="ghost">
                <TrashIcon /> {t("Hapus")}
              </Button>
            )}
            <Button
              onClick={() => setPickerOpen(true)}
              size="sm"
              title={hint}
              type="button"
              variant="outline"
            >
              <ArrowUpTrayIcon /> {t("Pilih {label}", { label })}
            </Button>
          </div>
        </div>
      )}

      <MediaPickerDialog
        current={value}
        kind="image"
        onClose={() => setPickerOpen(false)}
        onPickFile={(file) => {
          startCropFromFile(file);
          setPickerOpen(false);
        }}
        onSelect={(url) => {
          onChange(url);
          setPickerOpen(false);
        }}
        open={pickerOpen}
        scope={scope}
      />

      <Dialog
        onOpenChange={(next) => {
          if (!next && !saving) closeCrop();
        }}
        open={source !== null}
      >
        <DialogPopup className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Potong {label}", { label })}</DialogTitle>
          </DialogHeader>
          <DialogPanel className="space-y-4">
            <div className="relative h-64 w-full overflow-hidden rounded-lg bg-neutral-900">
              {source && (
                <Cropper
                  aspect={aspect}
                  crop={crop}
                  image={source}
                  onCropChange={setCrop}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                  showGrid={false}
                  zoom={zoom}
                />
              )}
            </div>
            <label className="flex items-center gap-3 text-sm">
              <span className="shrink-0 text-muted-foreground">{t("Perbesar")}</span>
              <input
                className="w-full accent-primary"
                max={3}
                min={1}
                onChange={(e) => setZoom(Number(e.target.value))}
                step={0.01}
                type="range"
                value={zoom}
              />
            </label>
          </DialogPanel>
          <DialogFooter>
            <Button disabled={saving} onClick={closeCrop} type="button" variant="ghost">
              {t("Batal")}
            </Button>
            <Button disabled={saving || !areaPixels} onClick={handleSave} type="button">
              {saving ? <Spinner className="size-4" /> : null}
              {t("Simpan")}
            </Button>
          </DialogFooter>
        </DialogPopup>
      </Dialog>
    </>
  );
}
