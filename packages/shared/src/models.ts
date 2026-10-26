export interface ProfileSkill {
  id: number;
  name: string;
  logo_url: string | null;
  is_highlight: boolean;
  order_index: number;
}

export interface HeroProfile {
  id: number;
  heading: string | null;
  subheading: string;
  description: string | null;
  logo_url: string | null;
  photo_url: string | null;
  cv_file_url: string | null;
  highlight_skills: ProfileSkill[];
  tech_stacks: ProfileSkill[];
}

export interface SocialLink {
  id: number;
  platform: string;
  url: string;
  logo_url: string;
  order_index: number;
}

export interface Certificate {
  id: number;
  organization: string | null;
  title: string;
  period: string | null;
  documents: string[];
}

export interface Education {
  id: number;
  logo_url: string | null;
  institution_name: string;
  degree_major: string;
  range_date: string;
  gpa: number | null;
  description: string | null;
  is_current: boolean;
  achievements: Certificate[];
}

export interface EducationContent {
  section_header: {
    title: string;
    description: string;
    illustration_url: string | null;
  };
  items: Education[];
}

export interface Experience {
  id: number;
  company_name: string;
  position: string;
  range_date: string;
  logo_url: string | null;
  description: string | null;
  skills: string[];
  photos: string[];
  is_current: boolean;
}

export interface ExperienceContent {
  section_header: {
    title: string;
    description: string;
    logo_svg: string | null;
  };
  items: Experience[];
}

export type ProjectMediaType = "image" | "video";

export interface ProjectMedia {
  type: ProjectMediaType;
  url: string;
}

export type ProjectBlockType = "heading" | "image" | "video" | "link" | "text" | "gallery";

export type ProjectBlockAlign = "left" | "center" | "right";

export type ProjectBlockFit = "fill" | "fit";

export interface ProjectHeadingBlock {
  type: "heading";
  text: string;
  align?: ProjectBlockAlign | null;
  isTitle?: boolean | null;
}

export interface ProjectImageBlock {
  type: "image";
  url: string;
  caption?: string | null;
  align?: ProjectBlockAlign | null;
  fit?: ProjectBlockFit | null;
}

export interface ProjectVideoBlock {
  type: "video";
  url: string;
  caption?: string | null;
  align?: ProjectBlockAlign | null;
  fit?: ProjectBlockFit | null;
}

export interface ProjectLinkBlock {
  type: "link";
  url: string;
  label?: string | null;
  align?: ProjectBlockAlign | null;
}

export interface ProjectTextBlock {
  type: "text";
  text: string;
  align?: ProjectBlockAlign | null;
}

export interface ProjectGalleryItem {
  url: string;
  caption?: string | null;
}

export interface ProjectGalleryBlock {
  type: "gallery";
  images: ProjectGalleryItem[];
}

export type ProjectBlock =
  | ProjectHeadingBlock
  | ProjectImageBlock
  | ProjectVideoBlock
  | ProjectLinkBlock
  | ProjectTextBlock
  | ProjectGalleryBlock;

export interface Project {
  id: number;
  slug: string;
  title: string;
  category: string;
  date_range: string | null;
  media: ProjectMedia[];
  tech_stacks: string[];
  is_published: boolean;
  likes_count: number;
  shares_count: number;
  /** Ringkasan singkat isi (teks polos) — hanya di daftar `/home/projects`. */
  excerpt?: string | null;
  /** Kapan proyek dipublikasikan; null untuk draf. */
  published_at: string | null;
  created_at?: string;
}

export interface ProjectDetail extends Project {
  content: ProjectBlock[];
}

export type AnnouncementKind = "general" | "project";

export type AnnouncementType = "info" | "update" | "new_post";

export type ProjectPostMode = "auto" | "manual";

export interface ProjectAnnouncement {
  id: number;
  kind: AnnouncementKind;
  type: AnnouncementType;
  text: string | null;
  is_active: boolean;
  order_index: number;
  post_mode: ProjectPostMode;
  project_ids: number[];
  /** Resolved projects for `kind: "project"` (published only, public API). */
  projects?: Project[];
}

export interface ContactInboxItem {
  id: number;
  name: string;
  email: string;
  email_link?: string;
  /** Di endpoint daftar berupa cuplikan; teks lengkap lewat `GET /admin/inbox/:id`. */
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DashboardSummary {
  total_likes: number;
  total_shares: number;
  total_projects: number;
  total_photos: number;
  total_unread_messages: number;
}

export interface StorageTypeStats {
  count: number;
  size_mb: number;
}

export interface DashboardStats {
  summary: DashboardSummary;
  storage_details: {
    images: StorageTypeStats;
    videos: StorageTypeStats;
    documents: StorageTypeStats;
  };
  media_overview: {
    project_photos_count: number;
    experience_photos_count: number;
    storage_used_mb: number;
    storage_limit_mb: number;
  };
}

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
  created_at: string;
  in_use: boolean;
}
