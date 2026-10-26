import { useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import gsap from "gsap";
import type { HeroProfile } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { markIntroDone } from "@/lib/intro";

/** Batas tunggu data profil (ms); lewat dari ini air tetap dipenuhkan. */
const MAX_WAIT = 3500;
/** Selagi data dimuat, air naik pelan sampai level ini lalu menunggu. */
const LOADING_LEVEL = 82;

/** Permukaan air: dua periode gelombang dalam lebar 200%, digeser -50% agar mulus. */
function Wave({ className }: { className: string }) {
  return (
    <svg aria-hidden className={className} preserveAspectRatio="none" viewBox="0 0 2400 40">
      <path
        d="M0 20 Q 150 2 300 20 T 600 20 T 900 20 T 1200 20 T 1500 20 T 1800 20 T 2100 20 T 2400 20 V 40 H 0 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Loading page web public (dipasang di PublicLayout), tampil di setiap
 * pemuatan halaman sebelum konten terlihat: air naik mengisi layar dari 0% sampai 100%. Level air mengikuti
 * pemuatan data profil — naik pelan sampai ~82% selagi menunggu, lalu penuh
 * begitu data siap. Setelah penuh, layar air terangkat dan `markIntroDone()`
 * memicu entrance header, announcement, lalu konten.
 */
export function SiteIntro() {
  const [finished, setFinished] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const waterRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const countRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const level = useRef({ value: 0 });
  const fillTween = useRef<gsap.core.Tween | null>(null);

  const { data: profile, isError } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });
  const [timedOut, setTimedOut] = useState(false);
  // Satu pemicu boolean supaya data yang datang setelah timeout tidak memutar ulang.
  const go = Boolean(profile) || isError || timedOut;

  /** Terapkan level air (0–100) ke lapisan air, permukaan gelombang & angka. */
  const render = () => {
    const value = level.current.value;
    const top = 100 - value;
    if (waterRef.current) waterRef.current.style.clipPath = `inset(${top}% 0% 0% 0%)`;
    if (surfaceRef.current) surfaceRef.current.style.top = `${top}%`;
    const text = `${Math.round(value)}%`;
    for (const node of countRefs.current) if (node) node.textContent = text;
  };

  // Fase 1: kunci scroll, air naik pelan selagi data dimuat.
  useLayoutEffect(() => {
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const timer = window.setTimeout(() => setTimedOut(true), MAX_WAIT);

    fillTween.current = gsap.to(level.current, {
      value: LOADING_LEVEL,
      duration: 2.4,
      ease: "power1.out",
      onUpdate: render,
    });

    return () => {
      window.clearTimeout(timer);
      fillTween.current?.kill();
      html.style.overflow = prevOverflow;
    };
  }, []);

  // Fase 2: data siap → penuhkan air, lalu angkat layar dan mulai entrance.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !go) return;
    const elapsed = fillTween.current?.time() ?? 1;
    fillTween.current?.kill();

    const tl = gsap.timeline({
      onComplete: () => {
        document.documentElement.style.overflow = "";
        setFinished(true);
      },
    });

    tl.to(level.current, {
      value: 100,
      // Langsung lanjut naik dari level saat ini (tanpa jeda). Total pengisian
      // minimal ~2 detik supaya air terasa mengisi, bukan berkedip.
      duration: Math.max(1, 2 - elapsed),
      ease: "power2.inOut",
      onUpdate: render,
    })
      .to(countRefs.current, { yPercent: -40, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, "+=0.15")
      .to(root, { yPercent: -100, duration: 0.95, ease: "expo.inOut" }, "-=0.1")
      // Entrance dimulai saat layar sudah setengah terangkat — keduanya bertumpuk.
      .call(markIntroDone, [], "-=0.7");

    return () => {
      tl.kill();
    };
  }, [go]);

  if (finished) return null;

  const counter = "font-bold text-6xl tabular-nums tracking-tight sm:text-8xl";

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] overflow-hidden bg-[#FFF4F4] dark:bg-neutral-950"
      ref={rootRef}
    >
      {/* Angka di atas latar (sebelum terendam air). */}
      <div className="absolute inset-0 grid place-items-center text-neutral-900 dark:text-neutral-100">
        <span
          className={counter}
          ref={(node) => {
            countRefs.current[0] = node;
          }}
        >
          0%
        </span>
      </div>

      {/* Lapisan air: dipotong dari atas sesuai level; angka di dalamnya berwarna
          terang sehingga tampak "terendam" saat permukaan air melewatinya. */}
      <div
        className="absolute inset-0 grid place-items-center bg-sky-600 text-white dark:bg-sky-500"
        ref={waterRef}
        style={{ clipPath: "inset(100% 0% 0% 0%)" }}
      >
        <span
          className={counter}
          ref={(node) => {
            countRefs.current[1] = node;
          }}
        >
          0%
        </span>
      </div>

      {/* Permukaan air: dua gelombang dengan kecepatan berbeda agar terasa hidup. */}
      <div className="absolute inset-x-0 h-0" ref={surfaceRef} style={{ top: "100%" }}>
        <Wave className="absolute -bottom-px left-0 h-5 w-[200%] animate-wave-slow text-sky-600/45 sm:h-7 dark:text-sky-500/45" />
        <Wave className="absolute -bottom-px left-0 h-3.5 w-[200%] animate-wave text-sky-600 sm:h-5 dark:text-sky-500" />
      </div>
    </div>
  );
}
