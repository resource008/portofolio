import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { HeroProfile } from "@portofolio/shared";
import { apiGet } from "@/lib/api";

export function useFavicon() {
  const { data } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });
  const logoUrl = data?.logo_url;

  useEffect(() => {
    if (!logoUrl) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    // Tipe dibiarkan kosong agar browser menebak dari file (png, svg, webp, …).
    link.removeAttribute("type");
    link.href = logoUrl;
  }, [logoUrl]);
}
