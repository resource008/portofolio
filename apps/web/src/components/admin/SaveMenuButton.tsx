import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChevronDownIcon,
  DocumentArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Menu, MenuGroup, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";

export function SaveMenuButton({
  loading,
  onSave,
}: {
  loading?: boolean;
  onSave: (publish: boolean) => void;
}) {
  const { t } = useLanguage();

  return (
    <Menu>
      <MenuTrigger
        render={
          <Button loading={loading} type="button">
            <ArrowDownTrayIcon />
            {t("Simpan")}
            <ChevronDownIcon className="size-4" />
          </Button>
        }
      />
      <MenuPopup align="end" className="w-56" side="top" sideOffset={8}>
        <MenuGroup>
          <MenuItem onClick={() => onSave(true)}>
            <ArrowUpTrayIcon />
            {t("Simpan & Terapkan")}
          </MenuItem>
          <MenuItem onClick={() => onSave(false)}>
            <DocumentArrowDownIcon />
            {t("Simpan Sebagai Draf")}
          </MenuItem>
        </MenuGroup>
      </MenuPopup>
    </Menu>
  );
}
