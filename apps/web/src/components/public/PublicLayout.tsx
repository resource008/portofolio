import { Outlet } from "react-router-dom";
import { SiteIntro } from "@/components/public/SiteIntro";

/**
 * Layout bersama halaman public. Intro situs dipasang di sini (bukan per
 * halaman) sehingga diputar sekali saat pengunjung pertama masuk dari halaman
 * public mana pun, dan tidak diulang saat berpindah antar halaman public.
 */
export default function PublicLayout() {
  return (
    <>
      <Outlet />
      <SiteIntro />
    </>
  );
}
