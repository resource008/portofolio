import { Outlet } from "react-router-dom";
import { SiteIntro } from "@/components/public/SiteIntro";

export default function PublicLayout() {
  return (
    <>
      <Outlet />
      <SiteIntro />
    </>
  );
}
