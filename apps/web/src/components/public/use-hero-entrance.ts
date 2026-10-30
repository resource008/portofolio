import { useLayoutEffect, type RefObject } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { ENTRANCE } from "@/lib/intro";

gsap.registerPlugin(SplitText);

export function useHeroEntrance(
  scope: RefObject<HTMLElement | null>,
  ready: boolean,
) {
  useLayoutEffect(() => {
    const root = scope.current;
    if (!root || !ready) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      root.dataset.heroDone = "";
      return;
    }

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);
      const splits: SplitText[] = [];
      // Kembalikan DOM teks ke bentuk asli agar React tetap memegang node-nya.
      const tl = gsap.timeline({
        defaults: { ease: "expo.out", duration: 1.1 },
        delay: ENTRANCE.content,
        onComplete: () => {
          splits.forEach((split) => split.revert());
          root.dataset.heroDone = "";
        },
      });

      gsap.set(q("[data-hero]"), { autoAlpha: 1 });

      const [heading] = q("[data-hero='heading']");
      if (heading) {
        const split = SplitText.create(heading, {
          type: "lines",
          mask: "lines",
        });
        splits.push(split);
        tl.from(split.lines, { yPercent: 110, duration: 0.9 }, 0.1);
      }

      const [name] = q("[data-hero='name']");
      if (name) {
        const split = SplitText.create(name, {
          type: "words,lines",
          mask: "lines",
        });
        splits.push(split);
        tl.from(
          split.words,
          { yPercent: 115, rotate: 4, stagger: 0.07, duration: 1.2 },
          0.2,
        );
      }

      const roles = q("[data-hero='role']");
      if (roles.length) {
        tl.from(
          roles,
          {
            y: -14,
            autoAlpha: 0,
            rotate: (i: number) => (i % 2 === 0 ? -7 : 6),
            ease: "back.out(2.2)",
            duration: 0.7,
            stagger: 0.06,
          },
          0.45,
        );
      }

      const [description] = q("[data-hero='description']");
      if (description) {
        const split = SplitText.create(description, { type: "lines" });
        splits.push(split);
        tl.from(
          split.lines,
          {
            y: 14,
            autoAlpha: 0,
            stagger: 0.08,
            duration: 0.9,
            ease: "power3.out",
          },
          0.6,
        );
      }

      const [card] = q("[data-hero='card']");
      if (card) {
        tl.from(card, { autoAlpha: 0, duration: 1.2, ease: "power1.out" }, 0.25);
      }

      const [stamp] = q("[data-hero='stamp']");
      if (stamp) {
        tl.from(
          stamp,
          {
            scale: 1.6,
            // Kelas -rotate-6 memakai properti CSS `rotate`, jadi mulai dari +6° lewat transform.
            rotate: 6,
            autoAlpha: 0,
            ease: "back.out(3)",
            duration: 0.55,
          },
          0.95,
        );
      }

      const [marquee] = q("[data-hero='marquee']");
      if (marquee) tl.from(marquee, { autoAlpha: 0, x: 24, duration: 1 }, 1.05);

      const [hint] = q("[data-hero='hint']");
      if (hint)
        tl.from(
          hint,
          { autoAlpha: 0, y: 8, duration: 0.8, ease: "power2.out" },
          1.4,
        );
    }, root);

    return () => ctx.revert();
  }, [scope, ready]);
}
