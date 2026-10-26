import { useEffect, useRef, useState } from "react";
import { CalendarDateRangeIcon, CalendarIcon, LinkIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import type { ProjectBlock, ProjectBlockAlign, ProjectDetail, ProjectGalleryItem } from "@portofolio/shared";
import { safeHref, sanitizeHtml } from "@/lib/sanitize";
import { resolveTechLogo } from "@/lib/tech-logo";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MediaPlaceholder } from "@/components/public/MediaPlaceholder";
import { PhotoLightbox } from "@/components/public/PhotoLightbox";
import { glassPillClass, ProjectActions } from "@/components/public/ProjectActions";

function mediaAlignClass(align?: ProjectBlockAlign | null): string {
  if (align === "left") return "me-auto ms-0";
  if (align === "right") return "ms-auto me-0";
  return "mx-auto";
}

function TechPill({ name, logoOnly = false }: { name: string; logoOnly?: boolean }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  if (logoOnly && logo && !failed) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={<span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white shadow-sm" />}
        >
          <img
            alt={name}
            className="size-5 object-contain"
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
            src={logo}
          />
        </TooltipTrigger>
        <TooltipPopup>{name}</TooltipPopup>
      </Tooltip>
    );
  }

  return (
    <Badge
      className="h-auto gap-1.5 rounded-md bg-background/85 py-1 text-foreground backdrop-blur-sm"
      variant="secondary"
    >
      {logo && !failed ? (
        <span className="grid size-3.5 shrink-0 place-items-center rounded-sm bg-white">
          <img
            alt=""
            className="size-2.5 object-contain"
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
            src={logo}
          />
        </span>
      ) : null}
      {name}
    </Badge>
  );
}

function GalleryBlock({ images, bleed }: { images: ProjectGalleryItem[]; bleed: boolean }) {
  const [viewing, setViewing] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div
        className={cn(
          "flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]",
          bleed && "-mx-6 scroll-px-6 px-6",
        )}
      >
        {images.map((image, index) => (
          <figure className="shrink-0 snap-start" key={`${image.url}-${index}`}>
            <button
              aria-label={`Lihat foto ${index + 1} dari ${images.length}`}
              className="group block overflow-hidden rounded-xl border border-border/50 bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setViewing(index)}
              type="button"
            >
              <img
                alt={image.caption ?? ""}
                className="h-56 w-auto max-w-[80vw] object-contain transition-transform duration-300 group-hover:scale-105 sm:h-72"
                decoding="async"
                loading="lazy"
                src={image.url}
              />
            </button>
            {image.caption ? (
              <figcaption className="mt-1.5 max-w-64 text-muted-foreground text-xs">
                {image.caption}
              </figcaption>
            ) : null}
          </figure>
        ))}
      </div>

      <PhotoLightbox
        captions={images.map((image) => image.caption ?? null)}
        index={viewing}
        onClose={() => setViewing(null)}
        photos={images.map((image) => image.url)}
      />
    </>
  );
}

function ContentBlock({ block, bleed = false }: { block: ProjectBlock; bleed?: boolean }) {
  switch (block.type) {
    case "heading": {
      // Blok isTitle sudah dirender sebagai h1 di atas.
      if (block.isTitle) return null;
      return (
        <div
          className="space-y-3 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-medium [&_h3]:text-xl [&_h3]:font-semibold [&_p]:leading-relaxed [&_p]:text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground [&_em]:italic [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:space-y-1 [&_ul,&_ol]:ps-5 [&_a]:font-medium [&_a]:text-primary [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.text) }}
        />
      );
    }
    case "image":
      return (
        <figure className={cn(bleed ? "-mx-6" : [block.fit === "fit" && "w-fit max-w-full", mediaAlignClass(block.align)])}>
          <img
            alt={block.caption ?? ""}
            className={cn(
              "w-full",
              bleed ? "border-y border-border/50" : "rounded-2xl border border-border/50",
              block.fit === "fit" ? "max-h-[70vh] object-contain" : "aspect-video object-cover",
            )}
            decoding="async"
            loading="lazy"
            src={block.url}
          />
          {block.caption ? (
            <figcaption className={cn("mt-2 text-center text-sm text-muted-foreground", bleed && "px-6")}>
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "video":
      return (
        <figure className={cn(bleed ? "-mx-6" : [block.fit === "fit" && "w-fit max-w-full", mediaAlignClass(block.align)])}>
          <video
            className={cn(
              "w-full bg-black",
              bleed ? "border-y border-border/50" : "rounded-2xl border border-border/50",
              block.fit === "fit" ? "max-h-[70vh] object-contain" : "aspect-video object-cover",
            )}
            controls
            preload="metadata"
            src={block.url}
          />
          {block.caption ? (
            <figcaption className={cn("mt-2 text-center text-sm text-muted-foreground", bleed && "px-6")}>
              {block.caption}
            </figcaption>
          ) : null}
        </figure>
      );
    case "link":
      return (
        <a
          className="inline-flex max-w-full items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
          href={safeHref(block.url)}
          rel="noreferrer"
          target="_blank"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border bg-background text-muted-foreground">
            <LinkIcon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium text-sm">{block.label || block.url}</span>
            <span className="block max-w-full truncate text-muted-foreground text-xs">
              {block.url}
            </span>
          </span>
        </a>
      );
    case "text":
      return (
        <div
          className={cn(
            "space-y-3 break-words text-base leading-relaxed text-muted-foreground [overflow-wrap:anywhere] [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_b]:font-semibold [&_em]:italic [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:space-y-1 [&_ul,&_ol]:ps-5",
            block.align === "center" && "text-center",
            block.align === "right" && "text-end",
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(block.text) }}
        />
      );
    case "gallery":
      return <GalleryBlock bleed={bleed} images={block.images} />;
  }
}

function TechStackRow({ stacks, logoOnly }: { stacks: string[]; logoOnly: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let current: Animation | null = null;
    let timer = 0;
    let hovered = false;
    let stopped = false;

    const cycle = () => {
      if (stopped) return;
      const distance = track.scrollWidth;
      track.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" });
      timer = window.setTimeout(() => {
        current = track.animate(
          [{ transform: "translateX(0)" }, { transform: `translateX(-${distance}px)` }],
          { duration: (distance / 40) * 1000, easing: "linear" },
        );
        if (hovered) current.pause();
        current.onfinish = cycle;
      }, 1000);
    };
    cycle();

    const pause = () => {
      hovered = true;
      current?.pause();
    };
    const play = () => {
      hovered = false;
      if (current?.playState === "paused") current.play();
    };
    track.addEventListener("pointerenter", pause);
    track.addEventListener("pointerleave", play);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      current?.cancel();
      track.removeEventListener("pointerenter", pause);
      track.removeEventListener("pointerleave", play);
    };
  }, [stacks]);

  return (
    <TooltipProvider>
      <div className="-mx-1 overflow-hidden px-1 py-1">
        <div className="flex w-max items-center gap-1.5" ref={trackRef}>
          {stacks.map((stack) => (
            <span className="shrink-0" key={stack}>
              <TechPill logoOnly={logoOnly} name={stack} />
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function ProjectDetailBody({
  project,
  bleed = false,
}: {
  project: ProjectDetail;
  bleed?: boolean;
}) {
  const cover = project.media[0];

  return (
    <article>
      <div
        className={cn(
          "relative overflow-hidden bg-muted",
          bleed ? "-mx-6 -mt-6 border-b border-border/60" : "rounded-3xl border border-border/60",
        )}
      >
        {cover?.type === "video" ? (
          <video className="aspect-video w-full object-cover" controls src={cover.url} />
        ) : (
          <MediaPlaceholder
            className="aspect-video w-full"
            icon={RectangleStackIcon}
            rounded="rounded-none"
            src={cover?.url}
          />
        )}
        {project.category || project.date_range ? (
          <div className="absolute start-3 end-14 top-3 z-10 flex flex-wrap items-center gap-1.5">
            {project.category ? (
              <span className={glassPillClass}>
                {project.category}
              </span>
            ) : null}
            {project.date_range ? (
              <span className={cn(glassPillClass, "tabular-nums")}>
                <CalendarDateRangeIcon className="size-4" />
                {project.date_range}
              </span>
            ) : null}
          </div>
        ) : null}
        <ProjectActions className="absolute end-3 bottom-3 z-10" key={project.id} project={project} />
        {project.published_at || !project.is_published ? (
          <div className="absolute start-3 bottom-3 z-10 max-w-[calc(100%-10rem)]">
            {project.is_published && project.published_at ? (
              <span className={glassPillClass}>
                <CalendarIcon className="size-4" />
                <time dateTime={project.published_at}>
                  {new Date(project.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </span>
            ) : (
              <span className={cn(glassPillClass, "text-warning-foreground dark:text-warning-foreground")}>Draf</span>
            )}
          </div>
        ) : null}
      </div>

      <header className="mt-8">
        {project.tech_stacks.length > 0 ? (
<TechStackRow logoOnly={bleed} stacks={project.tech_stacks} />
        ) : null}
        <h1 className="mt-3 font-bold text-3xl tracking-tight sm:text-4xl">{project.title}</h1>
      </header>

      {project.content.length > 0 ? (
        <div className="mt-10 flex flex-col gap-7">
          {project.content.map((block, index) => (
            <ContentBlock bleed={bleed} block={block} key={index} />
          ))}
        </div>
      ) : null}
    </article>
  );
}
