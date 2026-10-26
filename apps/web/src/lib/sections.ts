export interface ContentSection {
  id: string;
  to: string;
  label: string;
  description: string;
}

/** Single source of truth for the "Ubah Konten" submenu + routes. */
export const CONTENT_SECTIONS: ContentSection[] = [
  {
    id: "hero",
    to: "/admin/content/hero",
    label: "Hero & Profil",
    description: "Kelola hero, profil, keahlian unggulan, dan tech stack pada halaman utama.",
  },
  {
    id: "education",
    to: "/admin/content/education",
    label: "Pendidikan",
    description: "Kelola riwayat pendidikan dan sertifikasi.",
  },
  {
    id: "experience",
    to: "/admin/content/experience",
    label: "Pengalaman",
    description: "Kelola pengalaman kerja dan organisasi.",
  },
  {
    id: "projects",
    to: "/admin/content/projects",
    label: "Proyek",
    description: "Kelola daftar proyek dan postingan.",
  },
];

export const DEFAULT_CONTENT_SECTION = CONTENT_SECTIONS[0].id;
