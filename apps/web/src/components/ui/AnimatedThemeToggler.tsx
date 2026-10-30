import { useCallback, useRef, type ComponentPropsWithoutRef } from "react";
import { flushSync } from "react-dom";
import { MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { resolveTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Diadaptasi dari Magic UI AnimatedThemeToggler: tema baru "terbuka" sebagai lingkaran
// dari tombol lewat View Transitions API. Memakai useTheme proyek, bukan class/localStorage sendiri.
export function AnimatedThemeToggler({
  className,
  duration = 450,
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

    await document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    }).ready;

    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
    );
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
