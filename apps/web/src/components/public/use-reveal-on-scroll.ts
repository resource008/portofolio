import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useIntroDone } from "@/lib/intro";
import { getMotionEnabled } from "@/lib/motion";

gsap.registerPlugin(ScrollTrigger);

export function useRevealOnScroll(
  scope: RefObject<HTMLElement | null>,
  delay = 0,
) {
  const introDone = useIntroDone();

  useLayoutEffect(() => {
    const root = scope.current;
    if (!root || !introDone || !getMotionEnabled()) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 82%", once: true },
        delay,
        defaults: { ease: "expo.out" },
      });
      tl.from("[data-reveal='img']", {
        scale: 0.7,
        rotate: -8,
        autoAlpha: 0,
        duration: 0.9,
        ease: "back.out(1.7)",
      })
        .from(
          "[data-reveal='title']",
          { clipPath: "inset(0% 0% 100% 0%)", y: 28, duration: 1 },
          0.12,
        )
        .from("[data-reveal='text']", { y: 16, autoAlpha: 0, duration: 0.9, ease: "power3.out" }, 0.3)
        .set("[data-reveal='title']", { clearProps: "clipPath" });
    }, root);

    return () => ctx.revert();
  }, [scope, introDone, delay]);
}
