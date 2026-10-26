import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import type { Project, ProjectDetail } from "@portofolio/shared";
import { ApiError, apiGet } from "@/lib/api";
import NotFoundPage from "@/pages/NotFoundPage";
import { Spinner } from "@/components/ui/spinner";
import { PublicHeader } from "@/components/public/PublicHeader";
import { SocialDock } from "@/components/public/SocialDock";
import { ProjectCard } from "@/components/public/ProjectCard";
import { ProjectDrawer } from "@/components/public/ProjectDrawer";
import { useRevealOnScroll } from "@/components/public/use-reveal-on-scroll";
import { ENTRANCE } from "@/lib/intro";
import giraffeVR from "@/assets/illustrations/giraffe-vr-headset.svg";

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
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-28 sm:px-6 md:pt-36">
        <div className="mx-auto flex max-w-3xl items-center gap-4 sm:gap-8" ref={revealRef}>
          <img
            data-reveal="img"
            alt="Jerapah lucu memakai headset realitas virtual"
            className="size-24 shrink-0 sm:size-40 md:size-48"
            decoding="async"
            src={giraffeVR}
          />
          <div>
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
          <p className="mt-10 text-center text-muted-foreground text-sm">
            Belum ada proyek.
          </p>
        )}
      </main>
      <ProjectDrawer onClose={closeDrawer} project={drawerProject} />
      <SocialDock />
    </div>
  );
}
