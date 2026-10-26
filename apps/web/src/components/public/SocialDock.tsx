import type * as React from "react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { EllipsisHorizontalIcon, FolderIcon, HomeIcon, ShareIcon } from "@heroicons/react/24/outline";
import type { Project, SocialLink } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { safeHref } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";
import Dock, { type DockItemData } from "@/components/ui/Dock";

function SocialLogo({
  url,
  className,
  iconClassName,
}: {
  url: string;
  className: string;
  iconClassName: string;
}) {
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        alt=""
        className={className}
        decoding="async"
        loading="lazy"
        onError={() => setFailed(true)}
        src={url}
      />
    );
  }

  return <ShareIcon className={cn("text-muted-foreground", iconClassName)} />;
}

const glyph = (Icon: React.ComponentType<React.ComponentProps<"svg">>) => (
  <Icon aria-hidden className="size-[22px]" />
);

/**
 * Di homepage dock disembunyikan selama hero masih terlihat, lalu muncul
 * setelah hero di-scroll lewat. Di halaman lain dock selalu tampil.
 */
function useDockVisible(): boolean {
  const { pathname } = useLocation();
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (pathname !== "/") return;
    const update = () => {
      const hero = document.getElementById("home");
      setPastHero(hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.6 : true);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return pathname !== "/" || pastHero;
}

/** Item dock yang aktif: "projects" di halaman /projects, "home" di homepage. */
function useActiveSection(): "home" | "projects" | null {
  const { pathname } = useLocation();
  if (pathname === "/") return "home";
  if (pathname === "/projects") return "projects";
  return null;
}

const PROJECTS_SEEN_KEY = "projects-last-seen";
/** Pengunjung baru: proyek yang terbit dalam rentang ini dihitung sebagai "baru". */
const NEW_PROJECT_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

function readLastSeen(): number {
  try {
    const stored = Number(localStorage.getItem(PROJECTS_SEEN_KEY));
    if (stored > 0) return stored;
  } catch {
    // localStorage bisa diblokir (mode privat) — anggap pengunjung baru.
  }
  return Date.now() - NEW_PROJECT_WINDOW_MS;
}

/**
 * Jumlah proyek yang terbit sejak pengunjung terakhir membuka /projects,
 * untuk badge di item Projects pada dock. Membuka /projects mereset badge.
 */
function useNewProjectsCount(): number {
  const { pathname } = useLocation();
  const [lastSeen, setLastSeen] = useState(readLastSeen);
  const { data } = useQuery({
    queryKey: ["home", "projects"],
    queryFn: () => apiGet<Project[]>("/home/projects"),
  });

  useEffect(() => {
    if (pathname !== "/projects") return;
    const now = Date.now();
    setLastSeen(now);
    try {
      localStorage.setItem(PROJECTS_SEEN_KEY, String(now));
    } catch {
      // Abaikan — badge hanya hilang untuk sesi ini.
    }
  }, [pathname]);

  if (pathname === "/projects") return 0;
  return (data ?? []).filter(
    (project) => project.published_at && Date.parse(project.published_at) > lastSeen,
  ).length;
}

/** Scroll halus ke section di homepage; dari halaman lain, pindah ke homepage dulu. */
function useSectionNavigator() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (id: string) => {
    if (pathname === "/") {
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else window.scrollTo({ top: 0, behavior: "smooth" });
      window.history.replaceState(null, "", `#${id}`);
      return;
    }
    navigate(`/#${id}`);
  };
}

/**
 * Footer dock: navigasi Home & Projects, lalu ikon sosial media. Icons are driven by the links added from the admin
 * (`/api/social-links`), dipisah dengan separator dari navigasi.
 */
export function SocialDock() {
  const { data } = useQuery({
    queryKey: ["social-links"],
    queryFn: () => apiGet<SocialLink[]>("/social-links"),
  });

  const goTo = useSectionNavigator();
  const navigate = useNavigate();
  const activeSection = useActiveSection();
  const visible = useDockVisible();
  const newProjects = useNewProjectsCount();

  const links = data ?? [];
  const isMobile = useIsMobile();
  const openLink = (link: SocialLink) => {
    const href = safeHref(link.url);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  };

  // Layar kecil dengan >1 sosial media: ringkas jadi satu item "…" yang
  // membuka menu berisi seluruh sosial media.
  const socialItems: DockItemData[] =
    isMobile && links.length > 1
      ? [
          {
            icon: glyph(EllipsisHorizontalIcon),
            label: "Sosial Media",
            menuOnClick: true,
            menu: links.map((link) => ({
              label: (
                <span className="flex items-center gap-2">
                  <SocialLogo
                    className="size-5 object-contain"
                    iconClassName="size-5"
                    url={link.logo_url}
                  />
                  {link.platform}
                </span>
              ),
              onClick: () => openLink(link),
            })),
          },
        ]
      : links.map((link) => ({
          icon: (
            <SocialLogo
              className="size-6 object-contain"
              iconClassName="size-6"
              url={link.logo_url}
            />
          ),
          label: link.platform,
          onClick: () => openLink(link),
        }));

  const items: DockItemData[] = [
    {
      icon: glyph(HomeIcon),
      label: "Home",
      active: activeSection === "home",
      onClick: () => goTo("home"),
    },
    {
      icon: glyph(FolderIcon),
      label: "Projects",
      active: activeSection === "projects",
      badge: newProjects > 9 ? "9+" : newProjects,
      onClick: () => navigate("/projects"),
    },
    ...(links.length > 0 ? [{ separator: true } as const] : []),
    ...socialItems,
  ];

  return (
    <>
      <div
        aria-hidden={!visible}
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)] transition-all duration-300 ease-out",
          visible ? "translate-y-0 opacity-100" : "invisible translate-y-full opacity-0",
        )}
      >
        <Dock
          animateIn
          baseItemSize={48}
          className="pointer-events-auto"
          items={items}
          magnification={64}
          panelHeight={62}
        />
      </div>
    </>
  );
}
