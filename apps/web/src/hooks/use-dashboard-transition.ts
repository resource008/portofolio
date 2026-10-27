import { translate } from "@/lib/language";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Flip, gsap } from "@/lib/gsap";
import { getMotionEnabled } from "@/lib/motion";

type Phase = "idle" | "covering" | "revealing" | "entrance";

type RevealTargets = {
  content: HTMLElement | null;
  contentSections: HTMLElement[];
  topbar: HTMLElement | null;
  sidebarFrame: HTMLElement | null;
  contentFrame: HTMLElement | null;
  sidebarItems: HTMLElement[];
};

function collectContentSections(content: HTMLElement | null): HTMLElement[] {
  if (!content) return [];
  const explicit = Array.from(content.querySelectorAll<HTMLElement>("[data-content-anim]"));
  const nodes: HTMLElement[] =
    explicit.length > 0
      ? explicit
      : Array.from(content.firstElementChild?.children ?? []).filter(
          (el): el is HTMLElement => el instanceof HTMLElement,
        );
  return nodes.filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
}

const ENTRANCE_SCALE = 1.4;
const CENTER_SCALE = ENTRANCE_SCALE;
const LOGO_MORPH_LIFT = 44;
const ENTRANCE_HOLD = 5;
const COVER_HOLD = 0.7;
export const RING_RADIUS = 29;
export const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const RING_SECONDS = 1.2;
const WELCOME_STROKE = 1.2;
const TYPING_SECONDS = 1.4;
const COVER_STROKE = 1;
const FILL_DELAY = 0.18;
const FILL_SECONDS = 0.35;
// Hidden via CSS by default so it never paints before GSAP takes over.
const LOADING_DISPLAY = "flex";

export type LoadingCaption = { text: string; welcome: boolean; nonce: number };

function startTyping(el: HTMLElement, username: string): gsap.core.Tween {
  const state = { count: 0 };
  el.textContent = "";
  return gsap.to(state, {
    count: username.length,
    duration: TYPING_SECONDS,
    ease: "none",
    delay: WELCOME_STROKE * 0.6,
    onUpdate: () => {
      el.textContent = username.slice(0, Math.round(state.count));
    },
    onComplete: () => {
      el.textContent = username;
    },
  });
}

function isPageReload(): boolean {
  if (typeof performance === "undefined") return false;
  const entry = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return entry?.type === "reload";
}

const ENTRANCE_KEY = "admin-entrance-shown";

function consumeWelcomeEntrance(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const already = sessionStorage.getItem(ENTRANCE_KEY) === "1";
  sessionStorage.setItem(ENTRANCE_KEY, "1");
  return !already;
}

export function resetWelcomeEntrance(): void {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(ENTRANCE_KEY);
}

// Transforms use a center origin, hence the size*(scale-1)/2 compensation.
function placeGhostAt(
  el: HTMLElement,
  target: { left: number; top: number; width: number; height: number },
): { x: number; y: number; scale: number } {
  gsap.set(el, { x: 0, y: 0, scale: 1, rotate: 0 });
  const nat = el.getBoundingClientRect();
  const scale = nat.width > 0 ? target.width / nat.width : 1;
  return {
    x: target.left - nat.left + (nat.width * (scale - 1)) / 2,
    y: target.top - nat.top + (nat.height * (scale - 1)) / 2,
    scale,
  };
}

function revealItemsAndContent(tl: gsap.core.Timeline, t: RevealTargets, at: number): void {
  tl.fromTo(
    t.sidebarItems,
    { opacity: 0, x: -28, filter: "blur(6px)" },
    { opacity: 1, x: 0, filter: "blur(0px)", duration: 0.45, stagger: 0.055, ease: "power3.out" },
    at,
  )
    .to(t.contentFrame ?? [], { opacity: 1, duration: 0.4, ease: "soft" }, at + 0.06)
    .fromTo(
      t.topbar ?? [],
      { opacity: 0, y: -28, filter: "blur(10px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.62, ease: "sidebar" },
      at + 0.1,
    )
    .fromTo(
      t.contentSections.length > 0 ? t.contentSections : (t.content ?? []),
      { opacity: 0, y: 40, filter: "blur(8px)" },
      {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.5,
        stagger: 0.08,
        ease: "power3.out",
      },
      at + 0.14,
    );
}

export function useDashboardTransition({
  navigate,
  pathname,
  rootRef,
  username,
  isMobile,
}: {
  navigate: (to: string) => void;
  pathname: string;
  rootRef: RefObject<HTMLElement | null>;
  username: string;
  isMobile: boolean;
}) {
  const flightRef = useRef<HTMLDivElement>(null);
  const flightAvatarRef = useRef<HTMLDivElement>(null);
  const flightLogoWrapRef = useRef<HTMLDivElement>(null);
  const flightRingRef = useRef<SVGCircleElement>(null);
  const flightLoadingRef = useRef<HTMLDivElement>(null);
  const flightTypingRef = useRef<HTMLSpanElement>(null);
  const flightTypingRowRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<gsap.core.Animation | null>(null);
  const captionNonce = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [caption, setCaption] = useState<LoadingCaption | null>(null);

  const showCaption = useCallback((text: string, welcome: boolean) => {
    captionNonce.current += 1;
    setCaption({ text, welcome, nonce: captionNonce.current });
  }, []);

  const hideCaption = useCallback(() => setCaption(null), []);

  const query = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      return {
        content: null,
        contentSections: [] as HTMLElement[],
        logo: null,
        topbar: null,
        topbarChrome: [] as HTMLElement[],
        sidebarFrame: null,
        contentFrame: null,
        sidebarItems: [] as HTMLElement[],
      };
    }
    const content = root.querySelector<HTMLElement>("[data-transition-content]");
    return {
      content,
      contentSections: collectContentSections(content),
      logo: root.querySelector<HTMLElement>("[data-sidebar-logo]"),
      topbar: root.querySelector<HTMLElement>("[data-topbar-anim]"),
      topbarChrome: Array.from(root.querySelectorAll<HTMLElement>("[data-topbar-chrome]")),
      sidebarFrame: root.querySelector<HTMLElement>('[data-slot="sidebar-inner"]'),
      contentFrame: root.querySelector<HTMLElement>("[data-transition-frame]"),
      sidebarItems: Array.from(root.querySelectorAll<HTMLElement>("[data-sidebar-anim]")).filter(
        (el) => el.offsetWidth > 0,
      ),
    };
  }, [rootRef]);

  const killText = useCallback(() => {
    textRef.current?.kill();
    textRef.current = null;
  }, []);

  useEffect(() => killText, [killText]);

  const buildReveal = useCallback((): gsap.core.Timeline | null => {
    const flight = flightRef.current;
    const flightAvatar = flightAvatarRef.current;
    const flightRing = flightRingRef.current;
    const flightLoading = flightLoadingRef.current;
    const flightTyping = flightTypingRef.current;
    const {
      content,
      contentSections,
      logo,
      topbar,
      topbarChrome,
      sidebarFrame,
      contentFrame,
      sidebarItems,
    } = query();

    if (!flight || !flightLoading || !content || !logo) {
      setPhase("idle");
      return null;
    }

    killText();

    // Reset the caption lift before the FLIP so the ghost lands on the real slot.
    const logoWrap = flightLogoWrapRef.current;
    if (logoWrap) gsap.set(logoWrap, { y: 0 });

    // On mobile the logo lives in the topbar, so hide only its chrome, not the header.
    if (isMobile) {
      gsap.set(topbar ?? [], { opacity: 1, y: 0, filter: "none" });
      gsap.set(topbarChrome, { opacity: 0, y: -16, filter: "blur(8px)" });
    }

    const target = logo.getBoundingClientRect();
    const targetRadius = Number.parseFloat(window.getComputedStyle(logo).borderRadius) || 12;

    const targets: RevealTargets = {
      content,
      contentSections,
      topbar,
      sidebarFrame,
      contentFrame,
      sidebarItems,
    };
    const cleanup = [
      sidebarFrame,
      contentFrame,
      content,
      ...contentSections,
      ...sidebarItems,
      topbar,
      ...topbarChrome,
      logoWrap,
    ].filter((el): el is HTMLElement => Boolean(el));

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.set(flight, { display: "none", x: 0, y: 0, scale: 1 });
        gsap.set(flightLoading, { display: "none", opacity: 0 });
        gsap.set(logo, { clearProps: "opacity" });
        gsap.set(cleanup, { clearProps: "all" });
        if (flightAvatar) gsap.set(flightAvatar, { clearProps: "all" });
        if (flightRing) gsap.set(flightRing, { clearProps: "all" });
        if (flightTyping) gsap.set(flightTyping, { clearProps: "all" });
        hideCaption();
        setPhase("idle");
      },
    });

    if (flightRing) {
      gsap.set(flightRing, { opacity: 0, attr: { "stroke-dashoffset": RING_CIRCUMFERENCE } });
    }

    tl.to(flightLoading, { opacity: 0, duration: 0.2, ease: "power2.in" }, 0)
      .to(sidebarFrame ?? [], { opacity: 1, duration: 0.4, ease: "power2.out" }, 0.1)
      .add(() => {
        const state = Flip.getState(flight);
        const { x, y, scale } = placeGhostAt(flight, target);
        gsap.set(flight, {
          x,
          y,
          scale,
          borderRadius: targetRadius,
          opacity: 1,
          display: "grid",
        });
        Flip.from(state, {
          duration: 0.6,
          ease: "sidebar",
          props: "borderRadius",
        });
      }, 0.05)
      .set(logo, { clearProps: "opacity" }, 0.66)
      .set(flight, { display: "none" }, 0.66);

    if (isMobile) {
      tl.to(
        topbarChrome,
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.5,
          stagger: 0.06,
          ease: "sidebar",
        },
        0.68,
      )
        .to(contentFrame ?? [], { opacity: 1, duration: 0.4, ease: "soft" }, 0.72)
        .fromTo(
          targets.contentSections.length > 0 ? targets.contentSections : (targets.content ?? []),
          { opacity: 0, y: 40, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.5,
            stagger: 0.08,
            ease: "power3.out",
          },
          0.76,
        );
    } else {
      revealItemsAndContent(tl, targets, 0.68);
    }

    return tl;
  }, [query, killText, hideCaption, isMobile]);

  const runCovering = useCallback(
    ({ onCovered }: { onCovered?: () => void } = {}): boolean => {
      const flight = flightRef.current;
      const flightRing = flightRingRef.current;
      const flightLoading = flightLoadingRef.current;
      const flightTyping = flightTypingRef.current;
      const flightTypingRow = flightTypingRowRef.current;
      const logoWrap = flightLogoWrapRef.current;
      const { content, contentSections, logo, topbar, sidebarFrame, contentFrame, sidebarItems } =
        query();

      if (
        !flight ||
        !flightLoading ||
        !content ||
        !logo ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return false;
      }

      const rect = logo.getBoundingClientRect();
      const radius = Number.parseFloat(window.getComputedStyle(logo).borderRadius) || 12;

      gsap.set(flight, { display: "grid", opacity: 1, borderRadius: radius });
      // Reveal the loading block before measuring, or the ghost lands off the sidebar slot.
      gsap.set(flightLoading, { display: LOADING_DISPLAY, opacity: 0 });
      if (flightRing) {
        gsap.set(flightRing, { opacity: 0, attr: { "stroke-dashoffset": RING_CIRCUMFERENCE } });
      }
      if (flightTyping) flightTyping.textContent = "";
      if (flightTypingRow) gsap.set(flightTypingRow, { display: "none" });

      // Offset the column before measuring so placeGhostAt starts on the real logo slot.
      if (logoWrap) gsap.set(logoWrap, { y: LOGO_MORPH_LIFT });

      const { x, y, scale } = placeGhostAt(flight, rect);
      gsap.set(flight, { x, y, scale, transformOrigin: "50% 50%" });
      gsap.set(logo, { opacity: 0 });

      setPhase("covering");

      const panelFrames = [sidebarFrame, contentFrame].filter(
        (el): el is HTMLElement => Boolean(el),
      );

      const textAt = 0.7;

      gsap
        .timeline({
          onComplete: () => {
            onCovered?.();
            setPhase("revealing");
          },
        })
        .to(
          sidebarItems,
          { opacity: 0, x: -14, filter: "blur(4px)", duration: 0.22, stagger: 0.02, ease: "power2.in" },
          0,
        )
        .to(
          topbar ?? [],
          { opacity: 0, y: -20, filter: "blur(6px)", duration: 0.24, ease: "power2.in" },
          0,
        )
        .to(
          contentSections.length > 0 ? contentSections : content,
          { opacity: 0, y: 24, filter: "blur(8px)", duration: 0.26, stagger: 0.05, ease: "soft" },
          0.02,
        )
        .to(panelFrames, { opacity: 0, duration: 0.25, ease: "power2.in" }, 0)
        .to(
          flight,
          { x: 0, y: 0, scale: CENTER_SCALE, borderRadius: 999, duration: 0.62, ease: "sidebar" },
          0.16,
        )
        .to(flightRing ?? [], { opacity: 1, duration: 0.2, ease: "power2.out" }, textAt)
        .to(
          flightRing ?? [],
          { attr: { "stroke-dashoffset": 0 }, duration: RING_SECONDS, ease: "power1.inOut" },
          textAt,
        )
        .to(flightLoading, { opacity: 1, duration: 0.3, ease: "power2.out" }, textAt)
        .to(logoWrap ?? [], { y: 0, duration: 0.5, ease: "sidebar" }, textAt)
        .add(() => showCaption(translate("Mohon Tunggu"), false), textAt)
        .to({}, { duration: COVER_STROKE + FILL_DELAY + FILL_SECONDS + COVER_HOLD }, textAt)
        .to(
          [flightLoading, flightRing ?? []],
          { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: hideCaption },
        );

      return true;
    },
    [query, showCaption, hideCaption],
  );

  const start = useCallback(
    (to: string) => {
      if (phase !== "idle" || to === pathname) return;
      if (!getMotionEnabled()) {
        navigate(to);
        return;
      }
      const ran = runCovering({ onCovered: () => navigate(to) });
      if (!ran) navigate(to);
    },
    [navigate, pathname, phase, runCovering],
  );

  const playEntrance = useCallback(() => {
    if (phase !== "idle") return;
    if (!getMotionEnabled()) return;

    const flight = flightRef.current;
    const flightAvatar = flightAvatarRef.current;
    const flightRing = flightRingRef.current;
    const flightLoading = flightLoadingRef.current;
    const flightTyping = flightTypingRef.current;
    const flightTypingRow = flightTypingRowRef.current;
    const logoWrap = flightLogoWrapRef.current;
    const { content, contentSections, logo, topbar, sidebarFrame, contentFrame, sidebarItems } =
      query();

    if (
      !flight ||
      !flightLoading ||
      !flightTyping ||
      !content ||
      !logo ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    setPhase("entrance");

    gsap.set(sidebarItems, { opacity: 0, x: -28, filter: "blur(6px)" });
    gsap.set(topbar ?? [], { opacity: 0, y: -28, filter: "blur(10px)" });
    gsap.set(
      contentSections.length > 0 ? contentSections : content,
      { opacity: 0, y: 40, filter: "blur(8px)" },
    );
    gsap.set(
      [sidebarFrame, contentFrame].filter((el): el is HTMLElement => Boolean(el)),
      { opacity: 0 },
    );
    gsap.set(logo, { opacity: 0 });

    gsap.set(flight, {
      display: "grid",
      x: 0,
      y: 0,
      scale: ENTRANCE_SCALE,
      rotate: 0,
      opacity: 0,
      borderRadius: 999,
      transformOrigin: "50% 50%",
    });

    if (flightAvatar) gsap.set(flightAvatar, { scale: 0.8 });
    if (flightRing) {
      gsap.set(flightRing, { opacity: 1, attr: { "stroke-dashoffset": RING_CIRCUMFERENCE } });
    }

    gsap.set(flightLoading, { display: LOADING_DISPLAY, opacity: 0 });
    if (logoWrap) gsap.set(logoWrap, { y: LOGO_MORPH_LIFT });
    flightTyping.textContent = "";

    const reload = isPageReload();
    const welcome = !reload && consumeWelcomeEntrance();
    if (flightTypingRow) {
      gsap.set(flightTypingRow, { display: welcome ? "flex" : "none" });
    }

    const textAt = RING_SECONDS + 0.2;

    const tl = gsap.timeline({ onComplete: () => buildReveal() });

    if (flightRing) {
      tl.to(
        flightRing,
        { attr: { "stroke-dashoffset": 0 }, duration: RING_SECONDS, ease: "power1.inOut" },
        0,
      );
    }
    tl.to(flight, { opacity: 1, duration: 0.3, ease: "power2.out" }, RING_SECONDS);
    if (flightAvatar) {
      tl.fromTo(
        flightAvatar,
        { scale: 0.8 },
        { scale: 1, duration: 0.35, ease: "back.out(1.7)" },
        RING_SECONDS,
      );
    }
    tl.to(flightLoading, { opacity: 1, duration: 0.3, ease: "power2.out" }, textAt);
    if (logoWrap) {
      tl.to(logoWrap, { y: 0, duration: 0.5, ease: "sidebar" }, textAt);
    }
    if (welcome) {
      tl.add(() => {
        showCaption(translate("Selamat Datang!"), true);
        textRef.current = startTyping(flightTyping, username);
      }, textAt)
        .to({}, { duration: WELCOME_STROKE + FILL_DELAY + FILL_SECONDS + ENTRANCE_HOLD }, textAt)
        .to(
          [flightLoading, flightRing ?? []],
          { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: hideCaption },
        );
    } else {
      tl.add(() => showCaption(translate("Mohon Tunggu"), false), textAt)
        .to({}, { duration: COVER_STROKE + FILL_DELAY + FILL_SECONDS + ENTRANCE_HOLD }, textAt)
        .to(
          [flightLoading, flightRing ?? []],
          { opacity: 0, duration: 0.25, ease: "power2.in", onComplete: hideCaption },
        );
    }
  }, [phase, query, buildReveal, username, showCaption, hideCaption]);

  useLayoutEffect(() => {
    if (phase !== "revealing") return;
    buildReveal();
  }, [phase, buildReveal]);

  return {
    flightRef,
    flightAvatarRef,
    flightLogoWrapRef,
    flightRingRef,
    flightLoadingRef,
    flightTypingRef,
    flightTypingRowRef,
    caption,
    active: phase !== "idle",
    start,
    playEntrance,
  };
}
