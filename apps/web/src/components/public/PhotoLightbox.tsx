import { useEffect, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { Dialog, DialogBackdrop, DialogPortal } from "@/components/ui/dialog";

interface PhotoLightboxProps {
  photos: string[];
  captions?: (string | null)[];
  index: number | null;
  originRect?: DOMRect | null;
  getOriginRect?: (index: number) => DOMRect | null;
  onIndexChange?: (index: number) => void;
  onClose: () => void;
}

const ZOOM_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

function flipTransform(from: DOMRect, to: DOMRect) {
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = Math.min(from.width / to.width, from.height / to.height);
  return `translate(${dx}px, ${dy}px) scale(${scale})`;
}

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PhotoLightbox({
  photos,
  captions,
  index,
  originRect,
  getOriginRect,
  onIndexChange,
  onClose,
}: PhotoLightboxProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLImageElement | null)[]>([]);
  const closingRef = useRef(false);
  const [closing, setClosing] = useState(false);
  const [current, setCurrent] = useState(0);
  const open = index !== null;

  useEffect(() => {
    if (index === null) return;
    setCurrent(index);
    setClosing(false);
    const frame = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (track) track.scrollTo({ left: index * track.clientWidth, behavior: "instant" });
      closingRef.current = false;
      zoomFromOrigin(index);
    });
    return () => cancelAnimationFrame(frame);
  }, [index]);

  const zoomFromOrigin = (target: number) => {
    const img = imageRefs.current[target];
    const fromRect = getOriginRect?.(target) ?? originRect;
    if (!img || !fromRect || reducedMotion()) return;
    const run = () => {
      img.animate(
        [
          { transform: flipTransform(fromRect, img.getBoundingClientRect()), borderRadius: "12px" },
          { transform: "none" },
        ],
        { duration: 450, easing: ZOOM_EASING },
      );
    };
    if (img.complete && img.naturalWidth > 0) run();
    else img.addEventListener("load", run, { once: true });
  };

  const handleClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    const img = imageRefs.current[current];
    const targetRect = getOriginRect?.(current) ?? (current === index ? originRect : null);
    if (img && targetRect && !reducedMotion()) {
      setClosing(true);
      const anim = img.animate(
        [
          { transform: "none", borderRadius: "8px" },
          {
            transform: flipTransform(targetRect, img.getBoundingClientRect()),
            borderRadius: "12px",
          },
        ],
        { duration: 320, easing: ZOOM_EASING, fill: "forwards" },
      );
      anim.finished.finally(() => {
        setClosing(false);
        onClose();
      });
      return;
    }
    onClose();
  };

  const goTo = (target: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(photos.length - 1, target));
    track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") goTo(current - 1);
    if (event.key === "ArrowRight") goTo(current + 1);
  };

  const navButton =
    "absolute top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md transition-colors hover:bg-white/25 disabled:pointer-events-none disabled:opacity-0 lg:grid";

  return (
    <Dialog onOpenChange={(next) => !next && handleClose()} open={open}>
      <DialogPortal>
        {/* Prefix -webkit- untuk Safari iOS lama. */}
        <DialogBackdrop
          className={cn(
            "bg-black/60 backdrop-blur-xl transition-opacity duration-300 [-webkit-backdrop-filter:blur(24px)]",
            closing && "opacity-0",
          )}
          forceRender
        />
        <DialogPrimitive.Popup
          aria-label="Foto pengalaman"
          className="fixed inset-0 z-50 flex flex-col outline-none transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0"
          onKeyDown={onKeyDown}
        >
          <div
            className={cn(
              "flex items-center justify-between px-4 py-3 text-white transition-opacity duration-200 sm:px-6",
              closing && "opacity-0",
            )}
          >
            <span className="text-sm tabular-nums">
              {current + 1} / {photos.length}
            </span>
            <button
              aria-label="Tutup"
              className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/15 backdrop-blur-md transition-colors hover:bg-white/25"
              onClick={handleClose}
              type="button"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <div
              className="flex size-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={(event) => {
                const track = event.currentTarget;
                if (track.clientWidth > 0) {
                  const next = Math.round(track.scrollLeft / track.clientWidth);
                  setCurrent(next);
                  onIndexChange?.(next);
                }
              }}
              ref={trackRef}
            >
              {photos.map((photo, i) => (
                <div
                  className="flex size-full shrink-0 snap-center flex-col items-center justify-center gap-3 px-4 pb-6 sm:px-16"
                  key={`${photo}-${i}`}
                >
                  {/* Wrapper agar kotak <img> pas dengan gambar (dibutuhkan animasi zoom). */}
                  <div className="flex min-h-0 w-full flex-1 items-center justify-center">
                    <img
                      alt=""
                      className="max-h-full max-w-full rounded-lg object-contain"
                      decoding="async"
                      ref={(el) => {
                        imageRefs.current[i] = el;
                      }}
                      src={photo}
                    />
                  </div>
                  {captions?.[i] ? (
                    <p
                      className={cn(
                        "max-w-xl text-center text-sm text-white/80 transition-opacity duration-200",
                        closing && "opacity-0",
                      )}
                    >
                      {captions[i]}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              aria-label="Foto sebelumnya"
              className={cn(navButton, "left-4", closing && "opacity-0")}
              disabled={current === 0}
              onClick={() => goTo(current - 1)}
              type="button"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
            <button
              aria-label="Foto berikutnya"
              className={cn(navButton, "right-4", closing && "opacity-0")}
              disabled={current === photos.length - 1}
              onClick={() => goTo(current + 1)}
              type="button"
            >
              <ChevronRightIcon className="size-5" />
            </button>
          </div>

          {photos.length > 1 ? (
            <div
              className={cn(
                "flex justify-center gap-1.5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] transition-opacity duration-200",
                closing && "opacity-0",
              )}
            >
              {photos.map((photo, i) => (
                <button
                  aria-label={`Foto ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === current ? "w-5 bg-white" : "w-1.5 bg-white/40",
                  )}
                  key={`${photo}-${i}`}
                  onClick={() => goTo(i)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
