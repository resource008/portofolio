import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HScroll({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function onWheel(event: WheelEvent) {
      if (el!.scrollWidth <= el!.clientWidth) return;
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      el!.scrollLeft += delta;
      event.preventDefault();
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 cursor-grab select-none gap-3 overflow-x-auto pb-2 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden",
        className,
      )}
      onMouseDown={(event) => {
        if ((event.target as HTMLElement).closest("button, input, a, [role=button]")) return;
        const el = event.currentTarget;
        el.dataset.drag = "1";
        el.dataset.x = String(event.clientX);
        el.dataset.sl = String(el.scrollLeft);
      }}
      onMouseLeave={(event) => {
        event.currentTarget.dataset.drag = "0";
      }}
      onMouseMove={(event) => {
        const el = event.currentTarget;
        if (el.dataset.drag !== "1") return;
        event.preventDefault();
        el.scrollLeft = Number(el.dataset.sl) - (event.clientX - Number(el.dataset.x));
      }}
      onMouseUp={(event) => {
        event.currentTarget.dataset.drag = "0";
      }}
      ref={ref}
    >
      {children}
    </div>
  );
}