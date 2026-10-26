import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDateRangeIcon, RectangleStackIcon } from "@heroicons/react/24/outline";
import type { Project, ProjectMedia } from "@portofolio/shared";
import { resolveTechLogo } from "@/lib/tech-logo";
import { Badge } from "@/components/ui/badge";
import { MediaPlaceholder } from "@/components/public/MediaPlaceholder";

function TechLogoOnly({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  if (!logo || failed) return null;

  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-md bg-white shadow-sm">
      <img
        alt=""
        className="size-4 object-contain"
        decoding="async"
        loading="lazy"
        onError={() => setFailed(true)}
        src={logo}
      />
    </span>
  );
}

function ProjectCover({ media }: { media: ProjectMedia[] }) {
  const cover = media.find((item) => item.type === "image") ?? media[0];
  if (cover?.type === "video") {
    return (
      <video
        className="aspect-video w-full object-cover"
        muted
        preload="metadata"
        src={cover.url}
      />
    );
  }
  return (
    <MediaPlaceholder
      className="aspect-video w-full"
      icon={RectangleStackIcon}
      rounded="rounded-none"
      src={cover?.url}
    />
  );
}

export function ProjectCard({
  project,
  onOpen,
}: {
  project: Project;
  onOpen?: (project: Project) => void;
}) {
  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition-shadow hover:shadow-md"
      onClick={(event) => {
        if (!onOpen || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onOpen(project);
      }}
      to={`/projects/${project.slug}`}
    >
      <div className="relative aspect-video overflow-hidden bg-muted">
        <ProjectCover media={project.media} />
        {project.category || project.date_range ? (
          <div className="absolute inset-x-2 top-2 z-10 flex flex-wrap items-center gap-1.5">
            {project.category ? (
              <Badge className="bg-background/85 px-2 text-foreground backdrop-blur-sm" size="lg" variant="secondary">
                {project.category}
              </Badge>
            ) : null}
            {project.date_range ? (
              <Badge className="gap-1 bg-background/85 px-2 text-foreground tabular-nums backdrop-blur-sm" size="lg" variant="secondary">
                <CalendarDateRangeIcon className="size-4" />
                {project.date_range}
              </Badge>
            ) : null}
          </div>
        ) : null}
        {project.tech_stacks.length > 0 ? (
          <div className="absolute start-2 bottom-2 z-10 flex flex-wrap gap-1.5">
            {project.tech_stacks.slice(0, 5).map((stack) => (
              <TechLogoOnly key={stack} name={stack} />
            ))}
            {project.tech_stacks.length > 5 ? (
              <span className="grid size-6 place-items-center rounded-md bg-background/85 text-[10px] font-medium text-foreground backdrop-blur-sm">
                +{project.tech_stacks.length - 5}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-semibold text-foreground group-hover:text-primary">
          {project.title}
        </h3>
        {project.excerpt ? (
          <p className="mt-1.5 line-clamp-2 text-muted-foreground text-sm">{project.excerpt}</p>
        ) : null}
      </div>
    </Link>
  );
}
