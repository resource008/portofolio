import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HeroSection, HeroTechBar } from "@/components/public/HeroSection";
import { EducationSection } from "@/components/public/EducationSection";
import { ExperienceSection } from "@/components/public/ExperienceSection";
import { ContactSection } from "@/components/public/ContactSection";
import { SocialDock } from "@/components/public/SocialDock";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function HomePage() {
  const { hash, state, pathname } = useLocation();
  const navigate = useNavigate();
  const scrollTo = (state as { scrollTo?: string } | null)?.scrollTo;

  // Tautan lama (/#section) tetap jalan, tapi # dibuang dari URL.
  useEffect(() => {
    if (hash) navigate(pathname, { replace: true, state: { scrollTo: hash.slice(1) } });
  }, [hash, navigate, pathname]);

  // Dicoba beberapa kali karena data section diambil async.
  useEffect(() => {
    const id = scrollTo;
    if (!id) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      const target = document.getElementById(id);
      if (target || ++tries > 20) {
        window.clearInterval(timer);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [scrollTo]);

  return (
    <div className="min-h-svh bg-background">
      <PublicHeader />
      <main>
        <HeroSection />
        <HeroTechBar />
        <EducationSection />
        <ExperienceSection />
        <ContactSection />
      </main>
      <footer className="px-4 pt-8 pb-28 text-center text-muted-foreground text-xs sm:px-6">
        Ilustrasi oleh{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://iconscout.com/contributors/triple-t" rel="noopener noreferrer" target="_blank">
          Charcoal 3D
        </a>
        ,{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://iconscout.com/contributors/dominika-fasciszewska" rel="noopener noreferrer" target="_blank">
          Dominika Faściszewska
        </a>{" "}
        via IconScout dan{" "}
        <a className="underline underline-offset-2 hover:text-foreground" href="https://3dicons.co" rel="noopener noreferrer" target="_blank">
          3dicons
        </a>
      </footer>
      <SocialDock />
    </div>
  );
}
