import type * as React from "react";
import { HomeIcon, LinkIcon, MegaphoneIcon, PencilIcon } from "@heroicons/react/24/outline";
import { CONTENT_SECTIONS } from "@/lib/sections";

export type NavItem =
  | { kind: "link"; to: string; label: string; icon: React.ComponentType<React.ComponentProps<"svg">>; end?: boolean }
  | {
      kind: "group";
      label: string;
      icon: React.ComponentType<React.ComponentProps<"svg">>;
      children: { to: string; label: string }[];
    };

export const NAV: NavItem[] = [
  { kind: "link", to: "/admin", label: "Dasbor", icon: HomeIcon, end: true },
  {
    kind: "group",
    label: "Ubah Konten",
    icon: PencilIcon,
    children: CONTENT_SECTIONS.map((section) => ({ to: section.to, label: section.label })),
  },
  { kind: "link", to: "/admin/tautan-media", label: "Tautan Media", icon: LinkIcon },
  { kind: "link", to: "/admin/announcements", label: "Pengumuman", icon: MegaphoneIcon },
];

export const FLAT_NAV = NAV.flatMap((item) =>
  item.kind === "group"
    ? item.children.map((child) => ({ ...child, end: false }))
    : [{ to: item.to, label: item.label, end: item.end ?? false }],
);
