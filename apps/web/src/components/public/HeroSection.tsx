import type * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRightIcon,
  ChevronUpIcon,
  CodeBracketIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type {
  HeroProfile,
  Project,
  ProjectAnnouncement,
} from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { announcementMeta } from "@/lib/announcements";
import { resolveTechLogo } from "@/lib/tech-logo";
import { resolveTheme, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipPopup,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CvDialogContent } from "@/components/public/CvDialog";
import ProfileCard from "@/components/public/ProfileCard";
import { ProjectDrawer } from "@/components/public/ProjectDrawer";
import { useHeroEntrance } from "@/components/public/use-hero-entrance";
import { useIntroDone } from "@/lib/intro";

const PILL =
  "inline-flex items-center rounded-full border border-neutral-900/15 text-neutral-800 dark:border-white/15 dark:text-neutral-200";

const TICKER_HOLD_SECONDS = 1.5;

interface AnnouncementTickerItem {
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  label: string;
  badge: string;
  text: string;
  project?: Project;
}

const MARQUEE_PX_PER_SECOND = 50;

function announcementMessages(
  list: ProjectAnnouncement[],
): AnnouncementTickerItem[] {
  return list
    .filter((item) => item.is_active)
    .flatMap((item) => {
      if (item.kind === "project") {
        const items: AnnouncementTickerItem[] = [];
        const meta = announcementMeta("new_post");
        const note = item.text?.trim();
        const projects = item.projects ?? [];
        const base = {
          icon: SparklesIcon,
          label: meta.label,
          badge: meta.banner,
        };
        if (note) items.push({ ...base, text: note, project: projects[0] });
        for (const project of projects) {
          items.push({
            ...base,
            text: project.title,
            project,
          });
        }
        return items;
      }
      const meta = announcementMeta(item.type);
      const text = item.text?.trim() ?? "";
      return text
        ? [{ icon: meta.icon, label: meta.label, badge: meta.banner, text }]
        : [];
    });
}

function resolveMaxWidth(): number {
  if (typeof window === "undefined") return 320;
  return window.innerWidth < 480 ? 150 : window.innerWidth < 768 ? 230 : 320;
}

export function AnnouncementTicker({
  onItemChange,
  bare = false,
}: {
  bare?: boolean;
  onItemChange?: (item: AnnouncementTickerItem) => void;
} = {}) {
  const { data } = useQuery({
    queryKey: ["project-announcements"],
    queryFn: () =>
      apiGet<{ announcements: ProjectAnnouncement[] }>(
        "/project-announcements",
      ),
  });

  const messages = useMemo(
    () => announcementMessages(data?.announcements ?? []),
    [data],
  );
  const [index, setIndex] = useState(0);
  const [openedProject, setOpenedProject] = useState<Project | null>(null);
  const [pillWidth, setPillWidth] = useState<number | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);

  const advance = useCallback(() => {
    setIndex((current) =>
      messages.length > 1 ? (current + 1) % messages.length : current,
    );
  }, [messages.length]);

  // Add the pill's padding/border so the button isn't clipped at the right edge.
  const handleMeasure = useCallback((contentWidth: number) => {
    const node = pillRef.current;
    if (!node) return;
    const cs = window.getComputedStyle(node);
    const chrome =
      parseFloat(cs.paddingLeft) +
      parseFloat(cs.paddingRight) +
      parseFloat(cs.borderLeftWidth) +
      parseFloat(cs.borderRightWidth);
    setPillWidth(Math.round(contentWidth + chrome));
  }, []);

  useEffect(() => {
    setIndex((current) => (current >= messages.length ? 0 : current));
  }, [messages.length]);

  const current =
    messages.length > 0 ? messages[index % messages.length] : undefined;

  useEffect(() => {
    if (current) onItemChange?.(current);
  }, [current, onItemChange]);

  if (!current) return null;

  return (
    <>
      <div
        ref={pillRef}
        className={cn(
          bare
            ? "inline-flex h-10 items-center font-medium text-[15px] sm:text-base"
            : [PILL, "h-10 px-3.5 text-sm"],
          "min-w-0 max-w-full gap-2 overflow-hidden transition-[width] duration-700 ease-out",
        )}
        style={pillWidth != null ? { width: `${pillWidth}px` } : undefined}
      >
        <AnimatePresence mode="wait">
          <TickerMessage
            bare={bare}
            item={current}
            key={index}
            onAdvance={advance}
            onMeasure={handleMeasure}
            onOpenProject={setOpenedProject}
          />
        </AnimatePresence>
      </div>
      <ProjectDrawer
        onClose={() => setOpenedProject(null)}
        project={openedProject}
      />
    </>
  );
}

function TickerMessage({
  bare,
  item,
  onAdvance,
  onMeasure,
  onOpenProject,
}: {
  bare: boolean;
  item: AnnouncementTickerItem;
  onAdvance: () => void;
  onMeasure: (width: number) => void;
  onOpenProject: (project: Project) => void;
}) {
  const Icon = item.icon;
  const message = item.text;
  const readDuration = Math.min(30, Math.max(4, message.length / 10));

  const textRef = useRef<HTMLSpanElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [textWidth, setTextWidth] = useState(0);
  const [maxWidth, setMaxWidth] = useState(resolveMaxWidth);

  useLayoutEffect(() => {
    if (textRef.current) setTextWidth(textRef.current.offsetWidth);
  }, [message]);

  useLayoutEffect(() => {
    if (rootRef.current) onMeasure(rootRef.current.offsetWidth);
  }, [message, textWidth, onMeasure]);

  useEffect(() => {
    const strip = bare ? rootRef.current?.closest<HTMLElement>("[data-ticker-strip]") : null;
    if (strip) {
      const measure = () => {
        const cs = window.getComputedStyle(strip);
        const inner = strip.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        // 28 = ikon + gap di kiri, 36 = tombol "Lihat postingan" + gap.
        setMaxWidth(Math.max(80, inner - 28 - (item.project ? 36 : 0)));
      };
      const observer = new ResizeObserver(measure);
      observer.observe(strip);
      measure();
      return () => observer.disconnect();
    }
    const onResize = () => setMaxWidth(resolveMaxWidth());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bare, item.project]);

  const viewportWidth = Math.min(textWidth, maxWidth);
  const shouldRun = textWidth > viewportWidth;
  const runDuration = Math.max(readDuration, textWidth / MARQUEE_PX_PER_SECOND);

  useEffect(() => {
    if (shouldRun) return;
    const timer = setTimeout(onAdvance, readDuration * 1000);
    return () => clearTimeout(timer);
  }, [shouldRun, readDuration, onAdvance]);

  return (
    <motion.div
      ref={rootRef}
      animate={{ opacity: 1, y: 0, transition: { type: "spring", duration: 0.8, bounce: 0.25, delay: 0.3 } }}
      className="flex w-max items-center gap-2"
      exit={{ opacity: 0, y: -12, transition: { duration: 0.4, ease: "easeIn" } }}
      initial={{ opacity: 0, y: 16 }}
    >
      {bare ? null : (
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 font-medium text-xs",
            item.badge,
          )}
        >
          <Icon className="size-3.5" />
          {item.label}
        </span>
      )}

      <div
        className="overflow-hidden"
        style={{ width: viewportWidth > 0 ? `${viewportWidth}px` : undefined }}
      >
        <div
          className={cn(
            "flex w-max items-center",
            shouldRun && "animate-marquee-once",
          )}
          onAnimationEnd={shouldRun ? () => onAdvance() : undefined}
          style={
            shouldRun
              ? {
                  animationDuration: `${runDuration}s`,
                  animationDelay: `${TICKER_HOLD_SECONDS}s`,
                }
              : undefined
          }
        >
          <span className="whitespace-nowrap" ref={textRef}>
            {message}
          </span>
        </div>
      </div>

      {item.project ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  aria-label={`Lihat postingan ${message}`}
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full border border-neutral-900/10 text-neutral-700 transition-colors hover:bg-neutral-900/5 hover:text-neutral-900 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/10 dark:hover:text-neutral-50",
                    "size-7",
                  )}
                  onClick={() => item.project && onOpenProject(item.project)}
                  type="button"
                />
              }
            >
              <ChevronRightIcon className="size-3.5" />
            </TooltipTrigger>
            <TooltipPopup>Lihat postingan</TooltipPopup>
          </Tooltip>
        </TooltipProvider>
      ) : null}
    </motion.div>
  );
}

function TechLogo({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logo) && !failed;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "me-3 grid size-12 shrink-0 place-items-center rounded-lg border",
              "border-neutral-900/10 bg-white/80 dark:border-white/10 dark:bg-white/5",
            )}
          />
        }
      >
        {showImage ? (
          <img
            alt=""
            className="size-7 object-contain"
            decoding="async"
            loading="lazy"
            onError={() => setFailed(true)}
            src={logo ?? undefined}
          />
        ) : (
          <CodeBracketIcon className="size-5 text-neutral-500 dark:text-neutral-300" />
        )}
      </TooltipTrigger>
      <TooltipPopup>{name}</TooltipPopup>
    </Tooltip>
  );
}

function TechMarquee({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const repeat = Math.max(1, Math.ceil(12 / names.length));
  const loop = Array.from({ length: repeat }).flatMap(() => names);

  return (
    <TooltipProvider closeDelay={0} delay={0}>
      <div className="group hidden w-full overflow-hidden lg:block">
        <div className="flex w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
          {[0, 1].map((copy) => (
            <div
              aria-hidden={copy === 1}
              className="flex items-center"
              key={copy}
            >
              {loop.map((name, index) => (
                <TechLogo key={`${copy}-${index}`} name={name} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function MobileTechBar({ names }: { names: string[] }) {
  if (names.length === 0) return null;

  const repeat = Math.max(1, Math.ceil(8 / names.length));
  const loop = Array.from({ length: repeat }).flatMap(() => names);

  return (
    <TooltipProvider closeDelay={0} delay={0}>
      <div className="flex w-full items-center overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div
            className="flex w-max animate-marquee items-center"
            style={{ "--marquee-duration": "20s" } as React.CSSProperties}
          >
            {[0, 1].map((copy) => (
              <div
                aria-hidden={copy === 1}
                className="flex items-center"
                key={copy}
              >
                {loop.map((name, index) => (
                  <TechLogo key={`${copy}-${index}`} name={name} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function HeroTechBar() {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });
  const names = (profile?.tech_stacks ?? []).map((stack) => stack.name);
  if (names.length === 0) return null;

  return (
    <section className="border-y border-neutral-900/10 bg-neutral-900 py-10 lg:hidden dark:border-white/10 dark:bg-neutral-900">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 sm:px-6">
        <span className="ms-2 inline-flex -rotate-[15deg] items-center rounded-full border border-white/20 px-4 py-1.5 font-medium text-neutral-100 text-sm">
          Tech Stack
        </span>
        <MobileTechBar names={names} />
      </div>
    </section>
  );
}

export function AnnouncementBar() {
  const { data } = useQuery({
    queryKey: ["project-announcements"],
    queryFn: () =>
      apiGet<{ announcements: ProjectAnnouncement[] }>(
        "/project-announcements",
      ),
  });

  const messages = useMemo(
    () => announcementMessages(data?.announcements ?? []),
    [data],
  );

  const [item, setItem] = useState<AnnouncementTickerItem | null>(null);
  const handleItemChange = useCallback(
    (next: AnnouncementTickerItem) => setItem(next),
    [],
  );
  const badge = item?.badge ?? null;
  const Icon = item?.icon;

  if (messages.length === 0) return null;

  // Lapisan bg-background agar warna tipe (transparan) terbaca sebelum header berlatar.
  return (
    <div className="bg-background">
      <div
        className={cn(
          "border-b transition-colors duration-700",
          badge ?? "border-border/60 bg-background/80",
        )}
      >
        <div data-ticker-strip className="relative mx-auto flex h-10 max-w-6xl items-center justify-start gap-2 px-4 sm:px-6 lg:justify-center lg:px-12">
          <span className="relative size-5 shrink-0 lg:absolute lg:top-1/2 lg:left-6 lg:-translate-y-1/2">
            <AnimatePresence initial={false} mode="wait">
              {Icon ? (
                <motion.span
                  animate={{ opacity: 1, y: 0, transition: { type: "spring", duration: 0.8, bounce: 0.25, delay: 0.3 } }}
                  className="absolute inset-0"
                  exit={{ opacity: 0, y: -12, transition: { duration: 0.4, ease: "easeIn" } }}
                  initial={{ opacity: 0, y: 16 }}
                  key={item?.label}
                >
                  <Icon aria-label={item?.label} className="size-5" />
                </motion.span>
              ) : null}
            </AnimatePresence>
          </span>
          <AnnouncementTicker bare onItemChange={handleItemChange} />
        </div>
      </div>
    </div>
  );
}

function ScrollMouse() {
  const chevron = "absolute left-[2px] top-1/2 -mt-2.5";
  return (
    <span className="relative block h-12 w-6">
      <motion.span
        animate={{ y: [12, 0, -12], opacity: [0, 1, 0] }}
        className={chevron}
        transition={{
          duration: 1.6,
          times: [0, 0.5, 1],
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <ChevronUpIcon className="size-5" />
      </motion.span>
      <motion.span
        animate={{ y: [12, 0, -12], opacity: [0, 1, 0] }}
        className={chevron}
        transition={{
          duration: 1.6,
          times: [0, 0.5, 1],
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.8,
        }}
      >
        <ChevronUpIcon className="size-5" />
      </motion.span>
    </span>
  );
}

export function HeroSection() {
  const { data: profile, isError: profileError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });
  const { theme } = useTheme();
  const isDark = resolveTheme(theme) === "dark";
  const [cvOpen, setCvOpen] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const introDone = useIntroDone();
  // Gagal memuat profil tetap memutar entrance agar hero tidak tersembunyi.
  useHeroEntrance(sectionRef, (Boolean(profile) || profileError) && introDone);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const name = profile?.subheading ?? "";
  const heading = profile?.heading ?? "";
  const description = profile?.description ?? "";

  const roles = (profile?.highlight_skills ?? []).slice(0, 5);
  const techStacks = (profile?.tech_stacks ?? []).map((stack) => stack.name);

  return (
    <section
      className="relative flex min-h-svh flex-col overflow-hidden bg-[#FFF4F4] pt-28 pb-16 dark:bg-neutral-950"
      id="home"
      ref={sectionRef}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-6">
        <div className="flex flex-1 items-center py-6">
          <div className="grid w-full items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              {roles.length > 0 && (
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 lg:justify-start">
                  {roles.map((skill) => (
                    <span
                      data-hero="role"
                      className="inline-flex h-8 items-center rounded-full border border-neutral-900/15 px-3.5 font-medium text-sm text-neutral-800 dark:border-white/15 dark:text-neutral-200"
                      key={skill.id}
                    >
                      {skill.name}
                    </span>
                  ))}
                </div>
              )}

              {(heading || name) && (
                <h1 className="mt-5 text-center font-bold text-3xl text-neutral-900 leading-[1.05] tracking-tight sm:text-4xl md:text-5xl lg:text-left lg:text-6xl dark:text-neutral-50">
                  {heading && (
                    <span
                      data-hero="heading"
                      className="block font-medium text-lg text-neutral-500 tracking-normal sm:text-xl dark:text-neutral-400"
                    >
                      {heading}
                    </span>
                  )}
                  {name && (
                    <span className="mt-2 block" data-hero="name">
                      {name}
                    </span>
                  )}
                </h1>
              )}

              {description && (
                <p
                  data-hero="description"
                  className="mt-5 mx-auto max-w-xl text-center text-base text-neutral-600 sm:text-lg lg:mx-0 lg:text-left dark:text-neutral-400"
                >
                  {description}
                </p>
              )}

              {techStacks.length > 0 && (
                <div className="mt-9 hidden w-full flex-col items-start lg:flex">
                  <span
                    data-hero="stamp"
                    className={cn(
                      PILL,
                      "-rotate-6 px-4 py-1.5 font-medium text-neutral-700 text-sm dark:text-neutral-300",
                    )}
                  >
                    Tech Stack
                  </span>

                  <div className="mt-4 w-full" data-hero="marquee">
                    <TechMarquee names={techStacks} />
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative mx-auto hidden w-full max-w-md md:block"
              data-hero="card"
            >
              <div>
                <ProfileCard
                  avatarUrl={profile?.photo_url ?? ""}
                  contactText={profile?.cv_file_url ? "Lihat CV" : ""}
                  handle=""
                  miniAvatarUrl={profile?.logo_url ?? undefined}
                  name={name}
                  onContactClick={() => setCvOpen(true)}
                  status="Online"
                  theme={isDark ? "dark" : "light"}
                  title=""
                />
              </div>
            </div>
          </div>
        </div>

        {profile?.cv_file_url && (
          <CvDialogContent
            onOpenChange={setCvOpen}
            open={cvOpen}
            url={profile.cv_file_url}
          />
        )}

        <motion.div
          animate={{ opacity: scrolled ? 0 : 1 }}
          className="scroll-hint absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5 text-neutral-500 pointer-events-none dark:text-neutral-400"
          initial={false}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center gap-1.5" data-hero="hint">
            <ScrollMouse />
            <span className="text-xs">Gulir untuk melihat detail</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
