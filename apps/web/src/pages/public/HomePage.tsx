import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { HeroSection, HeroTechBar } from "@/components/public/HeroSection";
import { EducationSection } from "@/components/public/EducationSection";
import { ExperienceSection } from "@/components/public/ExperienceSection";
import { ContactSection } from "@/components/public/ContactSection";
import { SocialDock } from "@/components/public/SocialDock";
import { PublicHeader } from "@/components/public/PublicHeader";

export default function HomePage() {
  const { hash } = useLocation();

  // Dicoba beberapa kali karena data section diambil async.
  useEffect(() => {
    const id = hash.slice(1);
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
  }, [hash]);

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
      {/* Atribusi wajib untuk aset gratis IconScout; pb-28 memberi ruang agar tidak tertutup dock. */}
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
