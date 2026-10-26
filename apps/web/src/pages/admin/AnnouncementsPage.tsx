import AnnouncementManager from "@/components/admin/AnnouncementManager";
import { useLanguage } from "@/lib/language";

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl">{t("Pengumuman")}</h1>
        <p className="text-muted-foreground text-sm">
          {t("Kelola pengumuman umum dan promosi postingan proyek.")}
        </p>
      </div>
      <AnnouncementManager />
    </div>
  );
}