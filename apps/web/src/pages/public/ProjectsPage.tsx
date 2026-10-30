import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { RectangleStackIcon } from "@heroicons/react/24/outline";
import type { Project, ProjectDetail } from "@portofolio/shared";
import { ApiError, apiGet } from "@/lib/api";
import NotFoundPage from "@/pages/NotFoundPage";
import { Spinner } from "@/components/ui/spinner";
import { PublicHeader } from "@/components/public/PublicHeader";
import { SocialDock } from "@/components/public/SocialDock";
import { ProjectCard } from "@/components/public/ProjectCard";
import { LazyProjectDrawer as ProjectDrawer } from "@/components/public/LazyOverlays";
import { useRevealOnScroll } from "@/components/public/use-reveal-on-scroll";
import { ENTRANCE } from "@/lib/intro";
import giraffeVR from "@/assets/illustrations/giraffe-vr-headset.webp";

export default function ProjectsPage() {
  const [selected, setSelected] = useState<Project | null>(null);
  const { slug } = useParams();
  const navigate = useNavigate();
  const drawerProject = selected ?? (slug ? { slug } : null);
  const closeDrawer = () => {
    setSelected(null);
    if (slug) navigate("/projects", { replace: true });
  };
  const revealRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(revealRef, ENTRANCE.content);

  const { data, isLoading } = useQuery({
    queryKey: ["home", "projects"],
    queryFn: () => apiGet<Project[]>("/home/projects"),
  });

  const { error: slugError } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => apiGet<ProjectDetail>(`/projects/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  const projects = data ?? [];

  if (slug && !selected && slugError instanceof ApiError && slugError.status === 404) {
    return (
      <NotFoundPage
        description="Proyek yang kamu cari tidak tersedia, sudah dihapus, atau link-nya salah."
        title="Proyek tidak ditemukan"
      />
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main className="mx-auto flex min-h-svh max-w-6xl flex-col px-4 pb-28 pt-28 sm:px-6 md:pt-36">
        <div className="mx-auto flex max-w-3xl items-center gap-4 sm:gap-8" ref={revealRef}>
          <img
            data-reveal="img"
            alt="Jerapah lucu memakai headset realitas virtual"
            className="hidden size-40 shrink-0 sm:block md:size-48"
            decoding="async"
            src={giraffeVR}
          />
          <div className="w-full text-center sm:w-auto sm:text-left">
            <h1 className="font-bold text-3xl tracking-tight sm:text-4xl" data-reveal="title">
              Proyek
            </h1>
            <p className="mt-2 text-muted-foreground text-sm sm:mt-3 sm:text-base" data-reveal="text">
              Kumpulan proyek yang pernah saya kerjakan, mulai dari merancang konsep,
              mengembangkan, hingga meluncurkannya.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-10 grid place-items-center">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : projects.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} onOpen={setSelected} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
            <span className="grid size-14 place-items-center rounded-2xl border bg-muted text-muted-foreground">
              <RectangleStackIcon aria-hidden className="size-7" />
            </span>
            <div>
              <p className="font-medium text-sm">Belum ada proyek</p>
              <p className="mt-1 text-muted-foreground text-sm">
                Proyek yang sudah dipublikasikan akan tampil di sini.
              </p>
            </div>
          </div>
        )}
      </main>
      <ProjectDrawer onClose={closeDrawer} project={drawerProject} />
      <SocialDock />
    </div>
  );
}
