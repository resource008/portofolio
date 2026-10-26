import type * as React from "react";
import { ArrowPathIcon, InformationCircleIcon, MegaphoneIcon, SparklesIcon } from "@heroicons/react/24/outline";
import type { AnnouncementKind, AnnouncementType } from "@portofolio/shared";

export interface AnnouncementMeta {
  value: AnnouncementType;
  label: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
  /** Text/icon color on a neutral background. */
  accent: string;
  /** Banner container (background + border + text). */
  banner: string;
}

export const ANNOUNCEMENT_TYPES: AnnouncementMeta[] = [
  {
    value: "info",
    label: "Info",
    icon: InformationCircleIcon,
    accent: "text-blue-600 dark:text-blue-400",
    banner: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    value: "update",
    label: "Pembaruan",
    icon: ArrowPathIcon,
    accent: "text-amber-600 dark:text-amber-400",
    banner: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    value: "new_post",
    label: "Postingan Baru",
    icon: SparklesIcon,
    accent: "text-emerald-600 dark:text-emerald-400",
    banner: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
];

export function announcementMeta(type: AnnouncementType): AnnouncementMeta {
  return ANNOUNCEMENT_TYPES.find((item) => item.value === type) ?? ANNOUNCEMENT_TYPES[0];
}

/** Types available for the free-text ("general") announcement kind. */
export const GENERAL_ANNOUNCEMENT_TYPES: AnnouncementMeta[] = ANNOUNCEMENT_TYPES.filter(
  (item) => item.value !== "new_post",
);

export interface AnnouncementKindMeta {
  value: AnnouncementKind;
  label: string;
  description: string;
  icon: React.ComponentType<React.ComponentProps<"svg">>;
}

export const ANNOUNCEMENT_KINDS: AnnouncementKindMeta[] = [
  {
    value: "general",
    label: "Umum",
    description: "Teks bebas untuk info atau pembaruan.",
    icon: MegaphoneIcon,
  },
  {
    value: "project",
    label: "Proyek",
    description: "Promosikan postingan/proyek tertentu.",
    icon: SparklesIcon,
  },
];
