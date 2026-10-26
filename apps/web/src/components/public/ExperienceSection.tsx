import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BriefcaseIcon } from "@heroicons/react/24/outline";
import type { Experience, ExperienceContent } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { resolveTechLogo } from "@/lib/tech-logo";
import { cn } from "@/lib/utils";
import { ScrollTimeline } from "@/components/public/ScrollTimeline";
import { useRevealOnScroll } from "@/components/public/use-reveal-on-scroll";
import { MediaPlaceholder } from "@/components/public/MediaPlaceholder";
import { PhotoLightbox } from "@/components/public/PhotoLightbox";
import giraffeLaptop from "@/assets/illustrations/giraffe-laptop.svg";

function SkillPill({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-foreground/80 text-xs">
      {logo && !failed ? (
        <img
          alt=""
          className="size-3.5 object-contain"
          decoding="async"
          loading="lazy"
          onError={() => setFailed(true)}
          src={logo}
        />
      ) : null}
      {name}
    </span>
  );
}

/** Rotasi & geser tiap foto agar tampak seperti lembaran yang ditumpuk acak. */
const PHOTO_TILTS = ["-rotate-3 -translate-x-6", "rotate-2", "rotate-6 translate-x-6"];

/** Jarak (px) minimal agar gerakan dianggap tarikan, bukan klik. */
const DRAG_THRESHOLD = 6;
/** Jarak tarik (px) yang membuat foto "dikeluarkan" dan langsung dipratinjau. */
const PULL_OUT_DISTANCE = 120;

/**
 * Foto di folder yang bisa ditarik: mengikuti pointer dengan sedikit miring,
 * lalu memantul kembali ke folder saat dilepas. Tarikan cukup jauh membuka
 * pratinjau; klik biasa tetap membuka pratinjau seperti sebelumnya.
 */
function DraggablePhoto({
  className,
  hidden,
  index,
  onOpen,
  photo,
}: {
  className?: string;
  hidden: boolean;
  index: number;
  onOpen: (rect: DOMRect) => void;
  photo: string;
}) {
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const start = useRef<{ x: number; y: number; id: number } | null>(null);
  const moved = useRef(false);

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    moved.current = false;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    const x = event.clientX - origin.x;
    const y = event.clientY - origin.y;
    if (!moved.current) {
      if (Math.hypot(x, y) < DRAG_THRESHOLD) return;
      moved.current = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset({ x, y });
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const origin = start.current;
    if (!origin || origin.id !== event.pointerId) return;
    start.current = null;
    if (!moved.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const pulledOut = offset !== null && Math.hypot(offset.x, offset.y) > PULL_OUT_DISTANCE;
    setDragging(false);
    setOffset(null);
    if (pulledOut) onOpen(rect);
  };

  const style: React.CSSProperties | undefined = offset
    ? {
        // Pakai `transform` (bukan `translate`/`rotate`) sehingga tilt Tailwind
        // yang memakai properti individual tetap berlaku; tarikan ditumpuk di atasnya.
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${Math.max(-15, Math.min(15, offset.x / 12))}deg) scale(1.08)`,
      }
    : undefined;

  return (
    <button
      aria-label={`Lihat foto ${index + 1}`}
      className={cn(
        "absolute top-0 h-32 max-w-[70%] touch-none select-none overflow-hidden rounded-md border-4 border-white bg-white shadow-md transition-[transform,translate,rotate,scale,opacity,box-shadow] duration-300 ease-out hover:scale-105 active:scale-95 group-hover:-translate-y-1.5",
        // Saat ditarik: ikuti pointer tanpa jeda, di atas foto lain, bayangan lebih tebal.
        dragging
          ? "z-20 cursor-grabbing shadow-2xl duration-0"
          : "cursor-grab ease-[cubic-bezier(0.34,1.56,0.64,1)] duration-500",
        className,
        // Foto yang sedang dipratinjau "keluar" dari folder.
        hidden && "opacity-0",
      )}
      onClick={(event) => {
        // Klik setelah tarikan diabaikan (sudah ditangani di endDrag).
        if (moved.current) {
          moved.current = false;
          return;
        }
        onOpen(event.currentTarget.getBoundingClientRect());
      }}
      onPointerCancel={endDrag}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      style={style}
      type="button"
    >
      <img
        alt=""
        className="pointer-events-none h-full w-auto max-w-full object-contain"
        decoding="async"
        draggable={false}
        loading="lazy"
        src={photo}
      />
    </button>
  );
}

/**
 * Satu entri pengalaman berbentuk folder: foto-foto menyembul dari dalam
 * folder (kosong bila tidak ada foto), sampul depan berisi logo, posisi &
 * perusahaan, deskripsi & tech stack. Warna mengikuti tema (terang/gelap).
 */
function ExperienceRow({ item }: { item: Experience }) {
  const photos = item.photos.slice(0, PHOTO_TILTS.length);
  const hasPhotos = photos.length > 0;
  const [viewing, setViewing] = useState<number | null>(null);
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);

  return (
    <article>
      <div className={cn("group relative", hasPhotos ? "pt-20" : "pt-3")}>
        {/* Tab folder di kiri atas. */}
        <div
          aria-hidden
          className={cn(
            "absolute left-0 z-[1] h-[calc(0.75rem+1px)] w-32 rounded-t-lg border border-b-0 border-border/60 bg-muted sm:w-40",
            hasPhotos ? "top-17" : "top-0",
          )}
        />
        {/* Lembar belakang folder. */}
        <div
          aria-hidden
          className={cn(
            "absolute inset-x-0 bottom-0 rounded-xl rounded-tl-none border border-border/60 bg-muted",
            hasPhotos ? "top-20" : "top-3",
          )}
        />
        {/* Foto yang menyembul dari dalam folder. */}
        {hasPhotos ? (
          <div className="absolute inset-x-0 top-0 flex h-32 justify-center">
            {photos.map((photo, index) => (
              <DraggablePhoto
                className={PHOTO_TILTS[photos.length === 1 ? 1 : index]}
                hidden={viewing === index}
                index={index}
                key={photo}
                onOpen={(rect) => {
                  setOriginRect(rect);
                  setViewing(index);
                }}
                photo={photo}
              />
            ))}
          </div>
        ) : null}
        {/* Sampul depan: logo, posisi, perusahaan, deskripsi & tech stack. */}
        <div className="relative mt-6 space-y-4 rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-md sm:p-6">
          <div className="flex items-center gap-4">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl border bg-white shadow-sm">
              <MediaPlaceholder
                className="size-14 object-contain p-1.5"
                icon={BriefcaseIcon}
                rounded="rounded-none"
                src={item.logo_url}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base leading-snug sm:text-lg">{item.position}</h3>
              <p className="text-muted-foreground text-sm">{item.company_name}</p>
            </div>
          </div>

          {item.description ? (
            <p className="whitespace-pre-line text-justify text-muted-foreground text-sm leading-relaxed">
              {item.description}
            </p>
          ) : null}

          {item.skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {item.skills.map((skill) => (
                <SkillPill key={skill} name={skill} />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <PhotoLightbox
        index={viewing}
        onClose={() => setViewing(null)}
        originRect={originRect}
        photos={item.photos}
      />
    </article>
  );
}

export function ExperienceSection() {
  const revealRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(revealRef);
  const { data } = useQuery({
    queryKey: ["experiences"],
    queryFn: () => apiGet<ExperienceContent>("/experiences"),
  });

  const header = data?.section_header;
  const items = data?.items ?? [];
  const title = header?.title || "Pengalaman";
  const description =
    header?.description ||
    "Pengalaman profesional, magang, dan kepemimpinan organisasi dalam membangun produk digital yang berdampak nyata.";

  // Saat kosong: tampilkan hanya logo + judul di tengah, tanpa background/frame.
  const isEmpty = items.length === 0;

  return (
    <>
      {/* Section 1 — Header: logo, judul, dan deskripsi. */}
      <section
        className={cn(
          "scroll-mt-[7rem] py-16 md:py-24",
          !isEmpty && "bg-muted/40",
        )}
        id="portfolio"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            ref={revealRef}
            className={cn(
              "flex flex-col gap-6",
              // Rata kiri sejajar Hero & Kontak; saat kosong tetap di tengah.
              isEmpty ? "mx-auto max-w-2xl items-center text-center" : "items-start text-left",
            )}
          >
            <img
              data-reveal="img"
              alt="Jerapah lucu bekerja di laptop"
              className="size-36 shrink-0 sm:size-44 md:size-52"
              decoding="async"
              loading="lazy"
              src={header?.logo_svg ?? giraffeLaptop}
            />
            <div className="max-w-2xl">
              {title ? (
                <h2 className="font-bold text-3xl tracking-tight sm:text-4xl" data-reveal="title">{title}</h2>
              ) : null}
              {description ? (
                <p className="mt-3 text-muted-foreground" data-reveal="text">{description}</p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2 — Kartu pengalaman yang muncul saat discroll, hanya saat ada item. */}
      {!isEmpty ? (
        <section className="relative bg-muted/20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div>
              <ScrollTimeline
                className="py-16 md:py-28"
                getKey={(item) => item.id}
                items={items}
                renderItem={(item) => <ExperienceRow item={item} />}
                renderLabel={(item) => `${item.range_date}${item.is_current ? " - Saat Ini" : ""}`}
              />
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
