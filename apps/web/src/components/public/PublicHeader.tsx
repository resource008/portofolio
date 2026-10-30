import { useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import type { HeroProfile } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { consumeHeaderEntrance, ENTRANCE, useIntroDone } from "@/lib/intro";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AnnouncementBar } from "@/components/public/HeroSection";
import { HeaderSearch } from "@/components/public/HeaderSearch";
import { AnimatedThemeToggler } from "@/components/ui/AnimatedThemeToggler";

function BrandLogo({ profile }: { profile?: HeroProfile }) {
  const initial = (profile?.subheading ?? "").charAt(0).toUpperCase();

  return profile?.logo_url ? (
    <Avatar className="size-full">
      <AvatarImage alt={profile.subheading} src={profile.logo_url} />
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  ) : (
    <Avatar className="size-full">
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
  );
}

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === "/";
  const showSearch = pathname === "/projects" || pathname.startsWith("/projects/");
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  const headerRef = useRef<HTMLElement>(null);
  const introDone = useIntroDone();
  const entranceAllowed = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    const root = headerRef.current;
    if (!root || !introDone) return;
    entranceAllowed.current ??= consumeHeaderEntrance();
    if (!entranceAllowed.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(
        "[data-entrance='logo']",
        { y: -28, scale: 0.6, autoAlpha: 0, duration: 0.9, ease: "back.out(1.8)" },
        ENTRANCE.header,
      )
        .from("[data-entrance='toggle']", { y: -28, autoAlpha: 0, duration: 0.9 }, ENTRANCE.header + 0.08)
        .from("[data-entrance='announce']", { yPercent: -100, duration: 0.8 }, ENTRANCE.announce)
        .from(
          "[data-entrance='announce'] > *",
          { autoAlpha: 0, duration: 0.6, ease: "power2.out" },
          ENTRANCE.announce + 0.25,
        );
    }, root);
    return () => ctx.revert();
  }, [introDone]);

  return (
    <header className="fixed inset-x-0 top-0 z-50" ref={headerRef}>
      {isHome ? (
      <div
        aria-hidden={scrolled}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          scrolled ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
        )}
      >
        <div className="overflow-hidden">
          <div data-entrance="announce">
            <AnnouncementBar />
          </div>
        </div>
      </div>
      ) : null}

      <div
        className={cn(
          "mx-auto max-w-6xl transition-[padding] duration-300 ease-out",
          scrolled && "px-3 pt-3 sm:px-6",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between rounded-full border transition-all duration-300 ease-out",
            scrolled
              ? "h-14 border-white/40 bg-white/15 px-1.5 pr-3 shadow-[inset_0_1px_0_0_rgb(255_255_255/0.45),0_10px_30px_-10px_rgb(0_0_0/0.25)] backdrop-blur-xl backdrop-saturate-150 dark:border-white/10 dark:bg-neutral-900/25 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.08),0_10px_30px_-10px_rgb(0_0_0/0.6)]"
              : "h-16 border-transparent px-4 sm:px-6",
          )}
        >
        <a
          data-entrance="logo"
          aria-label="Ke atas"
          className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background shadow-sm"
          href="/"
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
            event.preventDefault();
            if (isHome) window.scrollTo({ top: 0, behavior: "smooth" });
            else navigate("/");
          }}
        >
          <BrandLogo profile={profile} />
        </a>

        <div className="flex items-center gap-2.5" data-entrance="toggle">
          {showSearch ? <HeaderSearch /> : null}
          <AnimatedThemeToggler className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-background/50 text-foreground/80 backdrop-blur-md transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        </div>
      </div>
    </header>
  );
}