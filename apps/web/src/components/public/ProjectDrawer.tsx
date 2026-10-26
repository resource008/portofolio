import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { Project, ProjectDetail } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { Drawer, DrawerBar, DrawerClose, DrawerPanel, DrawerPopup, DrawerTitle } from "@/components/ui/drawer";
import { Spinner } from "@/components/ui/spinner";
import { ProjectDetailBody } from "@/pages/public/ProjectDetailPage";

/** Drawer berisi konten detail proyek — dibuka dari kartu proyek atau link /projects/:slug. */
export function ProjectDrawer({
  project,
  onClose,
}: {
  /** Cukup slug saat dibuka dari link (/projects/:slug); judul diambil dari detail. */
  project: (Pick<Project, "slug"> & Partial<Pick<Project, "title">>) | null;
  onClose: () => void;
}) {
  // Simpan proyek terakhir agar konten tetap tampil selama animasi menutup.
  const [shown, setShown] = useState(project);
  useEffect(() => {
    if (project) setShown(project);
  }, [project]);

  const slug = shown?.slug;
  const { data, isLoading, error } = useQuery({
    queryKey: ["project", slug],
    queryFn: () => apiGet<ProjectDetail>(`/projects/${slug}`),
    enabled: Boolean(slug),
    retry: false,
  });

  return (
    <Drawer onOpenChange={(next) => !next && onClose()} open={project !== null}>
      <DrawerPopup className="mx-auto w-full max-w-3xl overflow-hidden has-data-[slot=drawer-bar]:pt-0">
        {/* Tombol tutup mengambang di atas media cover yang penuh sampai ujung atas. */}
        <DrawerClose
          aria-label="Tutup"
          className="absolute end-3 top-3 z-20 grid size-9 place-items-center rounded-full border border-white/40 bg-white/45 text-foreground backdrop-blur-md backdrop-saturate-150 transition-colors hover:bg-white/60 dark:border-white/15 dark:bg-black/30 dark:text-white dark:hover:bg-black/45"
        >
          <XMarkIcon className="size-5" />
        </DrawerClose>
        {/*
          Pegangan geser di layar kecil & menengah: tarik ke bawah untuk menutup.
          Konten di bawahnya swipe-ignore (dipakai scroll), jadi area ini yang
          menangkap gesturnya. Pil putih agar terlihat di atas media cover.
        */}
        <DrawerBar className="z-10 h-12 items-start pt-2.5 before:bg-white/80 before:shadow-sm lg:hidden" />
        <DrawerTitle className="sr-only">{data?.title ?? shown?.title ?? "Detail proyek"}</DrawerTitle>
        {/*
          Area scroll sendiri (bukan ScrollArea): popup tingginya auto sehingga
          viewport ScrollArea (h-full) tidak punya tinggi pasti dan tidak bisa
          di-scroll. swipe-ignore: sentuhan di konten dipakai untuk scroll,
          bukan menutup drawer.
        */}
        <DrawerPanel
          className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-10"
          data-base-ui-swipe-ignore
          scrollable={false}
        >
          {isLoading ? (
            <div className="grid min-h-60 place-items-center">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : null}

          {error ? (
            <p className="py-16 text-center text-muted-foreground text-sm">
              Gagal memuat proyek: {(error as Error).message}
            </p>
          ) : null}

          {data ? <ProjectDetailBody bleed project={data} /> : null}
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}
