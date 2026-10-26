import type { ReactElement } from "react";
import { ArrowRightStartOnRectangleIcon, ComputerDesktopIcon, MoonIcon, SparklesIcon, SunIcon } from "@heroicons/react/24/outline";
import { useTheme, type Theme } from "@/lib/theme";
import { useLanguage, type Language } from "@/lib/language";
import { useMotionEnabled } from "@/lib/motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Menu,
  MenuCheckboxItem,
  MenuItem,
  MenuPopup,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/menu";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";

interface ProfileMenuProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  onLogout: () => void;
  side?: "top" | "bottom";
  /** "menu" renders a desktop dropdown; "drawer" renders a bottom drawer (mobile). */
  mode?: "menu" | "drawer";
  /** Custom trigger element (used when the menu is embedded in another surface). */
  trigger?: ReactElement;
}

const THEME_OPTIONS = [
  { value: "light", label: "Terang", icon: SunIcon },
  { value: "dark", label: "Gelap", icon: MoonIcon },
  { value: "system", label: "Sistem", icon: ComputerDesktopIcon },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "id", label: "Indonesia" },
  { value: "en", label: "English" },
] as const;

function LanguageTabs({
  value,
  onChange,
}: {
  value: Language;
  onChange: (language: Language) => void;
}) {
  return (
    <Tabs onValueChange={(next) => onChange(next as Language)} value={value}>
      <TabsList className="w-full" size="sm">
        {LANGUAGE_OPTIONS.map(({ value: option, label }) => (
          <TabsTab className="flex-1" key={option} value={option}>
            {label}
          </TabsTab>
        ))}
      </TabsList>
    </Tabs>
  );
}

function ThemeTabs({ value, onChange }: { value: Theme; onChange: (theme: Theme) => void }) {
  const { t } = useLanguage();
  return (
    <Tabs onValueChange={(next) => onChange(next as Theme)} value={value}>
      <TabsList className="w-full" size="sm">
        {THEME_OPTIONS.map(({ value: option, label: rawLabel, icon: Icon }) => {
          const label = t(rawLabel);
          return (
          <Tooltip key={option}>
            <TooltipTrigger render={<TabsTab aria-label={label} className="flex-1" value={option} />}>
              <Icon />
            </TooltipTrigger>
            <TooltipPopup>{label}</TooltipPopup>
          </Tooltip>
          );
        })}
      </TabsList>
    </Tabs>
  );
}

export default function ProfileMenu({
  user,
  onLogout,
  side = "bottom",
  mode = "menu",
  trigger,
}: ProfileMenuProps) {
  const { theme, setTheme } = useTheme();
  const { motionEnabled, setMotionEnabled } = useMotionEnabled();
  const { language, setLanguage, t } = useLanguage();
  const initial = (user?.name ?? "A").charAt(0).toUpperCase();

  if (mode === "drawer") {
    return (
      <Drawer position="bottom">
        <DrawerTrigger
          render={
            trigger ?? (
              <Button aria-label={t("Menu akun")} className="rounded-full" size="icon" variant="ghost" />
            )
          }
        >
          {trigger ? null : (
            <Avatar className="size-6">
              {user?.image ? <AvatarImage alt={user.name ?? ""} src={user.image} /> : null}
              <AvatarFallback>{initial}</AvatarFallback>
            </Avatar>
          )}
        </DrawerTrigger>
        <DrawerPopup showCloseButton>
          <DrawerHeader>
            <div className="flex items-center gap-3 pe-8">
              <Avatar className="size-10">
                {user?.image ? (
                  <AvatarImage alt={user.name ?? ""} src={user.image} />
                ) : null}
                <AvatarFallback>{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <DrawerTitle className="truncate text-base">{user?.name ?? "Admin"}</DrawerTitle>
                <p className="truncate text-muted-foreground text-sm">{user?.email ?? ""}</p>
              </div>
            </div>
          </DrawerHeader>
          <DrawerPanel className="space-y-5">
            <div>
              <p className="mb-2 font-medium text-muted-foreground text-xs">{t("Tema")}</p>
              <ThemeTabs onChange={setTheme} value={theme} />
            </div>
            <div>
              <p className="mb-2 font-medium text-muted-foreground text-xs">{t("Bahasa")}</p>
              <LanguageTabs onChange={setLanguage} value={language} />
            </div>
            <label className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm">
                <SparklesIcon className="size-4" />
                {t("Animasi")}
              </span>
              <Switch
                checked={motionEnabled}
                onCheckedChange={(checked) => setMotionEnabled(checked)}
              />
            </label>
          </DrawerPanel>
          <DrawerFooter>
            <Button className="w-full sm:w-auto" onClick={onLogout} variant="destructive">
              <ArrowRightStartOnRectangleIcon />
              {t("Keluar")}
            </Button>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>
    );
  }

  return (
    <Menu>
      <MenuTrigger
        render={<Button aria-label={t("Menu akun")} className="rounded-full" size="icon" variant="ghost" />}
      >
        <Avatar className="size-6">
          {user?.image ? <AvatarImage alt={user.name ?? ""} src={user.image} /> : null}
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </MenuTrigger>
      <MenuPopup align="end" className="w-64" side={side}>
        <div className="px-2 py-1.5">
          <p className="truncate font-medium text-sm">{user?.name ?? "Admin"}</p>
          <p className="truncate text-muted-foreground text-xs">{user?.email ?? ""}</p>
        </div>
        <MenuSeparator />

        <div className="px-2 py-2">
          <p className="mb-2 font-medium text-muted-foreground text-xs">{t("Tema")}</p>
          <ThemeTabs onChange={setTheme} value={theme} />
        </div>

        <div className="px-2 pb-2">
          <p className="mb-2 font-medium text-muted-foreground text-xs">{t("Bahasa")}</p>
          <LanguageTabs onChange={setLanguage} value={language} />
        </div>

        <MenuSeparator />

        <MenuCheckboxItem
          checked={motionEnabled}
          onCheckedChange={(checked) => setMotionEnabled(checked)}
          variant="switch"
        >
          <SparklesIcon />
          {t("Animasi")}
        </MenuCheckboxItem>

        <MenuSeparator />
        <MenuItem onClick={onLogout} variant="destructive">
          <ArrowRightStartOnRectangleIcon />
          {t("Keluar")}
        </MenuItem>
      </MenuPopup>
    </Menu>
  );
}
