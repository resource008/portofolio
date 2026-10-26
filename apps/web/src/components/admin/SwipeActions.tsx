import { useRef, useState, type ButtonHTMLAttributes, type ReactNode, type TouchEvent } from "react";
import { cn } from "@/lib/utils";

// Lebar tray = 2 tombol aksi (ikon saja, masing-masing 48px).
const ACTION_WIDTH = 96;
// Jarak kecil antara item dan tray aksi saat row terbuka penuh.
const ACTION_GAP = 8;
// Total geseran yang dibutuhkan untuk membuka aksi sepenuhnya.
const TOTAL_SLIDE = ACTION_WIDTH + ACTION_GAP;
// Aksi baru "menetap" terbuka jika row digeser minimal separuh dari total,
// jadi geser kecil tidak langsung memunculkan tombol aksi.
const OPEN_THRESHOLD = TOTAL_SLIDE / 2;

/**
 * Swipe a row to the left to reveal trailing actions (e.g. Edit / Delete).
 * When `enabled` is false it just renders the children unchanged.
 * Aksi terakhir (biasanya "Hapus") ditempatkan paling kanan sehingga muncul
 * lebih dulu saat row digeser sedikit.
 */
export function SwipeActions({
  children,
  actions,
  enabled = true,
  className,
  bare = false,
}: {
  children: ReactNode;
  actions: ReactNode;
  enabled?: boolean;
  className?: string;
  /** Render tanpa latar kartu (mis. di dalam drawer list). */
  bare?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);

  if (!enabled) return <>{children}</>;

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    start.current = { x: touch.clientX, y: touch.clientY, horizontal: null };
  }

  function onTouchMove(event: TouchEvent) {
    const state = start.current;
    if (!state) return;
    const touch = event.touches[0];
    const dx = touch.clientX - state.x;
    const dy = touch.clientY - state.y;
    if (state.horizontal === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) state.horizontal = true;
      else if (Math.abs(dy) > 8) state.horizontal = false;
      else return;
    }
    if (!state.horizontal) return;
    const base = open ? -TOTAL_SLIDE : 0;
    setDrag(Math.max(-TOTAL_SLIDE, Math.min(0, base + dx)));
  }

  function endDrag() {
    if (drag !== null) setOpen(drag < -OPEN_THRESHOLD);
    setDrag(null);
    start.current = null;
  }

  const offset = drag ?? (open ? -TOTAL_SLIDE : 0);
  // Aksi muncul bertahap mengikuti seberapa jauh row digeser (progress reveal),
  // bukan langsung penuh saat mulai menyentuh. Saat row tertutup tetap
  // tersembunyi agar tidak tembus lewat konten transparan (mis. di drawer).
  const reveal = Math.min(1, Math.abs(offset) / TOTAL_SLIDE);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-y-0 end-0 flex"
        onClick={() => setOpen(false)}
        style={{
          width: ACTION_WIDTH,
          opacity: reveal,
          transition: drag === null ? "opacity 200ms ease" : undefined,
        }}
      >
        {actions}
      </div>
      <div
        className={cn("relative", !bare && "bg-card")}
        onTouchCancel={endDrag}
        onTouchEnd={endDrag}
        onTouchMove={onTouchMove}
        onTouchStart={onTouchStart}
        style={{
          touchAction: "pan-y",
          transform: `translateX(${offset}px)`,
          transition: drag === null ? "transform 200ms ease" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** A single full-height action button shown in the swipe tray (ikon saja). */
export function SwipeActionButton({
  className,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex w-12 items-center justify-center",
        className,
      )}
      onClick={onClick}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
