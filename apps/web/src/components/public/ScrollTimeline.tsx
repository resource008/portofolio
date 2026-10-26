import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionEnabled } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/** Garis pemicu di viewport (70% tinggi layar). Ujung isian bar selalu berada
    di garis ini, jadi checkpoint menyala tepat saat bar mencapainya. */
const VIEWPORT_LINE = "70%";
/** Jarak puncak baris ke titik tengah checkpoint (mt-6 + setengah size-6). */
const DOT_CENTER = 36;
/** Isian bar dibuka dari atas ke bawah lewat clip-path (gradien tidak gepeng). */
const FILL_EMPTY = "inset(0% 0% 100% 0% round 9999px)";
const FILL_FULL = "inset(0% 0% 0% 0% round 9999px)";

/**
 * Timeline vertikal berbasis GSAP ScrollTrigger: bar progress terisi mengikuti
 * scroll, dan setiap checkpoint (dengan label periode di sampingnya) menyala
 * lalu menampilkan kartunya saat bar mencapainya. Saat scroll kembali ke atas
 * melewati checkpoint, kartu disembunyikan lagi dengan animasi kebalikannya.
 *
 * Layout: desktop = [checkpoint] [periode] [kartu]; mobile = [checkpoint]
 * [periode di atas kartu].
 */
export function ScrollTimeline<T>({
  items,
  getKey,
  renderLabel,
  renderItem,
  className,
}: {
  items: T[];
  getKey: (item: T) => string | number;
  /** Label di samping checkpoint, mis. periode. */
  renderLabel: (item: T) => ReactNode;
  renderItem: (item: T) => ReactNode;
  /** Padding atas/bawah — rel bar ikut membentang di area padding ini. */
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { motionEnabled } = useMotionEnabled();

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const fill = root.querySelector<HTMLElement>("[data-timeline-fill]");
      const rows = gsap.utils.toArray<HTMLElement>("[data-timeline-row]", root);

      if (!motionEnabled) {
        gsap.set(fill, { clipPath: FILL_FULL });
        rows.forEach((row) => {
          gsap.set(row.querySelectorAll("[data-timeline-content], [data-timeline-label]"), {
            autoAlpha: 1,
          });
          row.querySelector("[data-timeline-dot]")?.setAttribute("data-active", "");
        });
        return;
      }

      // Bar progress: membentang dari puncak sampai dasar timeline; isian
      // bergerak linear sehingga ujungnya menempel di garis viewport.
      gsap.fromTo(
        fill,
        { clipPath: FILL_EMPTY },
        {
          clipPath: FILL_FULL,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: `top ${VIEWPORT_LINE}`,
            end: `bottom ${VIEWPORT_LINE}`,
            scrub: 0.4,
          },
        },
      );

      rows.forEach((row) => {
        const content = row.querySelector<HTMLElement>("[data-timeline-content]");
        const label = row.querySelector<HTMLElement>("[data-timeline-label]");
        const dot = row.querySelector<HTMLElement>("[data-timeline-dot]");

        const reveal = gsap
          .timeline({ paused: true })
          .fromTo(dot, { scale: 0.6 }, { scale: 1, duration: 0.3, ease: "back.out(2.5)" })
          .fromTo(
            label,
            { autoAlpha: 0, x: -12 },
            { autoAlpha: 1, x: 0, duration: 0.4, ease: "power2.out" },
            "<",
          )
          .fromTo(
            content,
            { autoAlpha: 0, y: 40, scale: 0.97 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
            "<0.05",
          );

        ScrollTrigger.create({
          trigger: row,
          start: `top+=${DOT_CENTER} ${VIEWPORT_LINE}`,
          onEnter: () => {
            dot?.setAttribute("data-active", "");
            reveal.timeScale(1).play();
          },
          onLeaveBack: () => {
            dot?.removeAttribute("data-active");
            reveal.timeScale(1.6).reverse();
          },
        });
      });
    }, root);

    // Tinggi kartu bisa berubah (gambar dimuat, dropdown dibuka) — hitung ulang.
    const observer = new ResizeObserver(() => ScrollTrigger.refresh());
    observer.observe(root);

    return () => {
      observer.disconnect();
      ctx.revert();
    };
  }, [items, motionEnabled]);

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      {/* Track progress bar di tepi kiri (sejajar header), center-nya 12px =
          tengah kolom checkpoint. */}
      <div
        aria-hidden="true"
        className="absolute top-0 bottom-0 left-[7px] w-2.5 rounded-full bg-muted p-0.5 ring-1 ring-border ring-inset"
      >
        <div
          className="h-full w-full rounded-full bg-blue-500 [clip-path:inset(0_0_100%_0_round_9999px)]"
          data-timeline-fill
        />
      </div>

      <ol className="space-y-10 md:space-y-14">
        {items.map((item) => (
          <li
            className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[1.5rem_10rem_minmax(0,1fr)]"
            data-timeline-row
            key={getKey(item)}
          >
            {/* Periode: desktop di kanan checkpoint; mobile di atas kartu. */}
            <div
              className="invisible col-start-2 row-start-1 pb-2 font-medium text-muted-foreground text-sm tabular-nums whitespace-nowrap opacity-0 sm:mt-6 sm:pb-0 sm:leading-6"
              data-timeline-label
            >
              {renderLabel(item)}
            </div>

            {/* Checkpoint: abu-abu sebelum tercapai, menyala saat aktif. */}
            <span
              aria-hidden="true"
              className="group relative z-10 col-start-1 row-span-2 row-start-1 mt-6 grid size-6 place-items-center rounded-full border-2 border-border bg-background transition-colors duration-300 data-active:border-blue-500 data-active:shadow-[0_0_0_4px] data-active:shadow-blue-500/20 sm:row-span-1"
              data-timeline-dot
            >
              <span className="size-2 rounded-full bg-border transition-colors duration-300 group-data-active:bg-blue-500" />
            </span>

            <div
              className="invisible col-start-2 row-start-2 opacity-0 sm:col-start-3 sm:row-start-1"
              data-timeline-content
            >
              {renderItem(item)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
