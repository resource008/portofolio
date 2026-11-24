import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Project, ProjectDetail } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";
import { Drawer, DrawerBar, DrawerClose, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { ProjectActions } from "@/components/public/ProjectActions";
import { ProjectDetailBody } from "@/pages/public/ProjectDetailPage";

export function ProjectDrawer({
  project,
  onClose,
}: {
  project: (Pick<Project, "slug"> & Partial<Pick<Project, "title">>) | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  // Simpan proyek terakhir agar konten tetap tampil selama animasi menutup.
  const [shown, setShown] = useState(project);
  const [showActions, setShowActions] = useState(true);
  const lastScrollTop = useRef(0);

  useEffect(() => {
    if (project) {
      setShown(project);
      setShowActions(true);
      lastScrollTop.current = 0;
    }
  }, [project]);

  const slug = shown?.slug;
  const { data, isLoading, error } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => apiGet<ProjectDetail>(`/projects/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  function handleScroll(event: React.UIEvent<HTMLDivElement>) {
    const top = event.currentTarget.scrollTop;
    const delta = top - lastScrollTop.current;
    if (top <= 16) {
      setShowActions(true);
      lastScrollTop.current = top;
      return;
    }
    if (delta > 6) {
      setShowActions(false);
      lastScrollTop.current = top;
    } else if (delta < -6) {
      setShowActions(true);
      lastScrollTop.current = top;
    }
  }

  return (
    <Drawer onOpenChange={(next) => !next && onClose()} open={project !== null}>
      <DrawerPopup className="mx-auto w-full max-w-3xl overflow-hidden has-data-[slot=drawer-bar]:pt-0">
        <DrawerClose
          aria-label={t("Tutup")}
          className="absolute end-3 top-3 z-20 grid size-11 place-items-center rounded-full border border-white/40 bg-white/45 text-foreground backdrop-blur-md backdrop-saturate-150 transition-colors hover:bg-white/60 dark:border-white/15 dark:bg-black/30 dark:text-white dark:hover:bg-black/45"
        >
          <XMarkIcon className="size-6" />
        </DrawerClose>
        {/* Konten di bawahnya swipe-ignore, jadi pegangan ini yang menangkap gestur tutup. */}
        <DrawerBar className="z-10 h-12 items-start pt-2.5 before:bg-white/80 before:shadow-sm lg:hidden" />
        <DrawerTitle className="sr-only">{data?.title ?? shown?.title ?? t("Detail proyek")}</DrawerTitle>
        {/* Bukan ScrollArea: tinggi popup auto sehingga viewport h-full tidak bisa di-scroll. */}
        <DrawerPanel
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-24"
          data-base-ui-swipe-ignore
          onScroll={handleScroll}
          scrollable={false}
        >
          {isLoading ? (
            <div className="grid min-h-60 place-items-center">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : null}

          {error ? (
            <p className="py-16 text-center text-muted-foreground text-sm">
              {t("Gagal memuat proyek")}: {(error as Error).message}
            </p>
          ) : null}

          {data ? <ProjectDetailBody bleed project={data} /> : null}
        </DrawerPanel>

        {data ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center pb-[env(safe-area-inset-bottom)] transition-all duration-300 ease-out",
              showActions ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            <div className={cn(showActions ? "pointer-events-auto" : "pointer-events-none")}>
              <ProjectActions
                className="rounded-full border border-border/60 bg-background/80 p-1.5 shadow-lg backdrop-blur-md dark:bg-card/85"
                key={data.id}
                project={data}
              />
            </div>
          </div>
        ) : null}
      </DrawerPopup>
    </Drawer>
  );
}
