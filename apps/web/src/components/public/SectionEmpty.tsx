import { InboxIcon } from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/language";

export function SectionEmpty() {
  const { t } = useLanguage();
  return (
    <div className="flex w-full max-w-2xl items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-5 text-left">
      <InboxIcon aria-hidden className="size-6 shrink-0 text-muted-foreground" />
      <div>
        <p className="font-medium text-sm">{t("Tidak ada data")}</p>
        <p className="text-muted-foreground text-sm">{t("Belum ada yang ditampilkan di bagian ini.")}</p>
      </div>
    </div>
  );
}
