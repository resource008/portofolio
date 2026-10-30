import { useCallback, type ComponentPropsWithoutRef } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { resolveTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Diadaptasi dari Magic UI AnimatedThemeToggler, tapi peralihannya fade (View Transitions API)
// di semua ukuran layar. Memakai useTheme proyek, bukan class/localStorage sendiri.
export function AnimatedThemeToggler({
  className,
  duration = 400,
  ...props
}: ComponentPropsWithoutRef<"button"> & { duration?: number }) {
  const { theme, setTheme } = useTheme();
  const isDark = resolveTheme(theme) === "dark";

  const toggle = useCallback(async () => {
    const next = isDark ? "light" : "dark";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!document.startViewTransition || reduced) {
      setTheme(next);
      return;
    }

    // Matikan transisi CSS sementara agar tampilan baru dipotret dengan warna final (tidak berkedip).
    const root = document.documentElement;
    root.classList.add("theme-switching");

    const transition = document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    });
    try {
      await transition.ready;
      root.animate(
        { opacity: [0, 1] },
        { duration, easing: "ease-in-out", fill: "both", pseudoElement: "::view-transition-new(root)" },
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
      type="button"
      {...props}
    >
      {isDark ? <SunIcon className="size-4.5" /> : <MoonIcon className="size-4.5" />}
    </button>
  );
}
