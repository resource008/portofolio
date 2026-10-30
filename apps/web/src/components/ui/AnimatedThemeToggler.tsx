import { useCallback, useRef, type ComponentPropsWithoutRef } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { resolveTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Diadaptasi dari Magic UI AnimatedThemeToggler: tema baru "terbuka" sebagai lingkaran
// dari tombol lewat View Transitions API. Memakai useTheme proyek, bukan class/localStorage sendiri.
function largeViewportHeight(): number {
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:100lvh;visibility:hidden;pointer-events:none";
  document.body.appendChild(probe);
  const value = probe.getBoundingClientRect().height;
  probe.remove();
  return value;
}

export function AnimatedThemeToggler({
  className,
  duration = 550,
  ...props
}: ComponentPropsWithoutRef<"button"> & { duration?: number }) {
  const { theme, setTheme } = useTheme();
  const isDark = resolveTheme(theme) === "dark";
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(async () => {
    const next = isDark ? "light" : "dark";
    const button = buttonRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!button || !document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }

    // Ukur posisi tombol saat diklik, sebelum DOM berubah (di HP header bisa bergeser setelahnya).
    // Titik awal = pusat tombol saat diklik (ikut ke mana pun tombolnya, mis. header mengambang).
    const { top, left, width, height } = button.getBoundingClientRect();
    const cx = left + width / 2;
    const cy = top + height / 2;
    const x = `${cx}px`;
    const y = `${cy}px`;
    // Di HP lapisan transisi setinggi layar penuh (bar alamat tersembunyi), jadi jari-jari
    // dihitung dari tinggi itu agar lingkaran tetap menutup seluruh layar.
    const fullHeight = Math.max(window.innerHeight, largeViewportHeight());
    const radius = `${Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, fullHeight - cy))}px`;

    // Matikan transisi CSS sementara agar tampilan baru dipotret dengan warna final (tidak berkedip).
    const root = document.documentElement;
    root.classList.add("theme-switching");

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    try {
      await transition.ready;
      root.animate(
        { clipPath: [`circle(0px at ${x} ${y})`, `circle(${radius} at ${x} ${y})`] },
        {
          duration,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          fill: "both",
          pseudoElement: "::view-transition-new(root)",
        },
      );
      await transition.finished;
    } finally {
      root.classList.remove("theme-switching");
    }
  }, [duration, isDark, setTheme]);

  return (
    <button
      aria-label={isDark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className={cn(className)}
      onClick={toggle}
      ref={buttonRef}
      type="button"
      {...props}
    >
      {isDark ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
    </button>
  );
}
