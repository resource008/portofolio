import { useEffect, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/language";
import { Dialog, DialogHeader, DialogPanel, DialogPopup, DialogTitle } from "@/components/ui/dialog";

interface MediaPreviewDialogProps {
  open: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
  /** Opsional: daftar URL foto untuk navigasi preview (prev/next). */
  photos?: string[];
  index?: number;
  onIndexChange?: (index: number) => void;
}

/** In-app preview for images and PDFs (no new tab).
 *  Saat `photos` diberikan, preview menjadi galeri dengan navigasi prev/next
 *  (tombol panah tampil di layar besar md+ dan dukungan tombol panah keyboard). */
export default function MediaPreviewDialog({
  open,
  url,
  title,
  onClose,
  photos,
  index = 0,
  onIndexChange,
}: MediaPreviewDialogProps) {
  const { t } = useLanguage();
  title ??= t("Pratinjau");
  const hasGallery = (photos?.length ?? 0) > 0;
  const canNav = hasGallery && photos!.length > 1;
  const safeIndex = Math.min(Math.max(index, 0), hasGallery ? photos!.length - 1 : 0);
  const currentUrl = hasGallery ? photos![safeIndex] : url;
  const isPdf = currentUrl ? /\.pdf($|\?)/i.test(currentUrl) : false;

  // Nilai-nilai yang dipakai di dalam event handler dibaca lewat ref supaya
  // handler selalu memakai nilai terbaru (tidak ada stale closure).
  const canNavRef = useRef(canNav);
  canNavRef.current = canNav;
  const photosRef = useRef(photos);
  photosRef.current = photos;
  const safeIndexRef = useRef(safeIndex);
  safeIndexRef.current = safeIndex;
  const onIndexChangeRef = useRef(onIndexChange);
  onIndexChangeRef.current = onIndexChange;

  function go(step: number) {
    const list = photosRef.current;
    if (!canNavRef.current || !onIndexChangeRef.current || !list) return;
    onIndexChangeRef.current((safeIndexRef.current + step + list.length) % list.length);
  }

  // Navigasi foto pakai keyboard: ←/→, dan < > (termasuk tombol fisik , dan .
  // yang menghasilkan < dan > saat ditekan tanpa Shift). Listener dipasang di
  // document dengan fase capture supaya tidak bisa diblokir/di-stop oleh komponen
  // lain di dalam dialog.
  const lastWheelRef = useRef(0);

  useEffect(() => {
    if (!open || !canNav) return;
    function onKeyDown(event: KeyboardEvent) {
      const navBack =
        event.key === "ArrowLeft" || event.key === "<" || event.key === ",";
      const navNext =
        event.key === "ArrowRight" || event.key === ">" || event.key === ".";
      if (!navBack && !navNext) return;
      // Cegah halaman/dialog ikut scroll saat menekan panah di dalam preview.
      event.preventDefault();
      if (navBack) go(-1);
      if (navNext) go(1);
    }
    // Scroll roda mouse: ke atas = foto sebelumnya, ke bawah = foto berikutnya.
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const now = Date.now();
      // Batasi kecepatan agar tidak melompat banyak foto dalam satu gerakan.
      if (now - lastWheelRef.current < 300) return;
      const delta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (delta === 0) return;
      lastWheelRef.current = now;
      go(delta > 0 ? 1 : -1);
    }
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, [open, canNav, safeIndex]);

  return (
    <Dialog
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      open={open}
    >
      <DialogPopup className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {canNav && (
            <p className="text-sm text-muted-foreground">
              {safeIndex + 1} / {photos!.length}
            </p>
          )}
        </DialogHeader>
        <DialogPanel>
          {currentUrl ? (
            isPdf ? (
              <iframe className="h-[75vh] w-full rounded-lg border" src={currentUrl} title={title} />
            ) : (
              <div className="relative">
                <img
                  alt={title}
                  className="mx-auto max-h-[75vh] w-auto rounded-lg border object-contain"
                  src={currentUrl}
                />
                {canNav && (
                  <>
                    <button
                      aria-label={t("Foto sebelumnya")}
                      className="absolute left-2 top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 p-2 text-white shadow transition hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                      onClick={() => go(-1)}
                      type="button"
                    >
                      <ChevronLeftIcon className="size-5" />
                    </button>
                    <button
                      aria-label={t("Foto berikutnya")}
                      className="absolute right-2 top-1/2 grid -translate-y-1/2 cursor-pointer place-items-center rounded-full bg-black/45 p-2 text-white shadow transition hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
                      onClick={() => go(1)}
                      type="button"
                    >
                      <ChevronRightIcon className="size-5" />
                    </button>
                  </>
                )}
              </div>
            )
          ) : null}
        </DialogPanel>
      </DialogPopup>
    </Dialog>
  );
}