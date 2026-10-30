import { useCallback, useRef, type ComponentPropsWithoutRef } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { resolveTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Diadaptasi dari Magic UI AnimatedThemeToggler: tema baru "terbuka" sebagai lingkaran
// dari tombol lewat View Transitions API. Memakai useTheme proyek, bukan class/localStorage sendiri.
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
    // Dalam persen, bukan piksel: di browser HP (mis. Chrome Android) lapisan view transition
    // bisa berbeda ukuran/posisi dari layar yang terlihat, sehingga koordinat piksel meleset.
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = `${(((left + width / 2) / window.innerWidth) * 100).toFixed(2)}%`;
    const y = `${(((top + height / 2) / window.innerHeight) * 100).toFixed(2)}%`;
    // 150% (dari diagonal/√2) selalu menutup seluruh lapisan dari titik mana pun.
    const radius = "150%";

    // Matikan transisi CSS sementara agar tampilan baru dipotret dengan warna final (tidak berkedip).
    const root = document.documentElement;
    root.classList.add("theme-switching");

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    try {
      await transition.ready;
      root.animate(
        { clipPath: [`circle(0% at ${x} ${y})`, `circle(${radius} at ${x} ${y})`] },
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
