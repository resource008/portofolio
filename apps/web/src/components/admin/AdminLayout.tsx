import type * as React from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bars3Icon, ChevronDownIcon, InboxIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { HeroProfile } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { gsap } from "@/lib/gsap";
import { getMotionEnabled } from "@/lib/motion";
import { useLanguage } from "@/lib/language";
import { FLAT_NAV, NAV } from "@/lib/nav";
import { CONTENT_SECTIONS } from "@/lib/sections";
import {
  requestProjectEditorReset,
  useProjectEditorMode,
} from "@/lib/project-editor-state";
import {
  requestEducationEditorReset,
  useEducationEditorMode,
} from "@/lib/education-editor-state";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useRealtimeInboxCount } from "@/hooks/use-realtime-inbox";
import {
  RING_CIRCUMFERENCE,
  RING_RADIUS,
  resetWelcomeEntrance,
  useDashboardTransition,
} from "@/hooks/use-dashboard-transition";
import { cn } from "@/lib/utils";
import ProfileMenu from "@/components/admin/ProfileMenu";
import {
  UnsavedChangesProvider,
  useRequestLeave,
} from "@/components/admin/unsaved-changes";
import StrokeText from "@/components/ui/StrokeText";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

function TopbarBreadcrumb({ onNavigate }: { onNavigate: (to: string) => void }) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const editorMode = useProjectEditorMode();
  const educationMode = useEducationEditorMode();

  const section = CONTENT_SECTIONS.find((item) => pathname.startsWith(item.to));
  const currentLabel =
    FLAT_NAV.find(({ to, end }) => (end ? pathname === to : pathname.startsWith(to)))?.label ??
    (pathname.startsWith("/admin/inbox") ? "Kotak Masuk" : "Dasbor");
  const currentLabelText = t(currentLabel);

  const isEditingProject = section?.id === "projects" && editorMode != null;
  const isEditingEducation = section?.id === "education" && educationMode != null;

  const experienceFormLabel =
    pathname === "/admin/content/experience/new"
      ? t("Tambah Pengalaman")
      : /^\/admin\/content\/experience\/\d+\/edit$/.test(pathname)
        ? t("Ubah Pengalaman")
        : null;

  const handleEditClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    onNavigate("/admin/content/hero");
  };

  const handleSectionClick = (event: ReactMouseEvent<HTMLAnchorElement>, to: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    if (isEditingProject) {
      requestProjectEditorReset();
      return;
    }
    if (isEditingEducation) {
      requestEducationEditorReset();
      return;
    }
    onNavigate(to);
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <SidebarSeparator className="mx-0 h-4" orientation="vertical" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {section ? (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink
                  aria-label={t("Ubah Konten")}
                  className="inline-flex items-center gap-1.5"
                  onClick={handleEditClick}
                  render={<Link to="/admin/content/hero" />}
                >
                  <span className="hidden truncate sm:inline">{t("Ubah Konten")}</span>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  href={section.to}
                  onClick={(event) => handleSectionClick(event, section.to)}
                >
                  {t(section.label)}
                </BreadcrumbLink>
              </BreadcrumbItem>
              {isEditingProject && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {editorMode === "draft"
                        ? t("Draf Proyek")
                        : editorMode === "edit"
                          ? t("Ubah Proyek")
                          : t("Tambah Proyek")}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {isEditingEducation && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>
                      {educationMode === "edit" ? t("Ubah Pendidikan") : t("Tambah Pendidikan")}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
              {experienceFormLabel && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{experienceFormLabel}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </>
          ) : (
            <BreadcrumbItem>
              <BreadcrumbPage className="truncate">{currentLabelText}</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

// Harus sedikit di atas durasi animasi tutup sheet (duration-200 di sheet.tsx).
const SHEET_CLOSE_MS = 240;

function SidebarNav({
  onNavigate: navigateTo,
  inboxUnread,
}: {
  onNavigate: (to: string) => void;
  inboxUnread: number;
}) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { state, isMobile, openMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;

  // Tutup sheet dulu sebelum transisi, kalau tidak sheet ikut terlihat dan logo topbar salah ukur.
  const onNavigate = (to: string) => {
    if (isMobile && openMobile && to !== pathname) {
      setOpenMobile(false);
      window.setTimeout(() => navigateTo(to), SHEET_CLOSE_MS);
      return;
    }
    navigateTo(to);
  };

  const prevOpen = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isMobile) return;
    const motionOk =
      getMotionEnabled() && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const collect = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-sidebar-anim]")).filter(
        (el) => el.offsetWidth > 0 || el.offsetHeight > 0,
      );

    if (prevOpen.current === null) {
      prevOpen.current = openMobile;
      if (!openMobile || !motionOk) return;
      gsap.fromTo(
        collect(),
        { opacity: 0, x: -28, filter: "blur(6px)" },
        {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          duration: 0.45,
          stagger: 0.055,
          ease: "power3.out",
        },
      );
      return;
    }

    if (prevOpen.current === openMobile || !motionOk) return;
    if (openMobile) {
      gsap.fromTo(
        collect(),
        { opacity: 0, x: -28, filter: "blur(6px)" },
        {
          opacity: 1,
          x: 0,
          filter: "blur(0px)",
          duration: 0.45,
          stagger: 0.055,
          ease: "power3.out",
        },
      );
    } else {
      gsap.to(collect(), {
        opacity: 0,
        x: -14,
        filter: "blur(4px)",
        duration: 0.22,
        stagger: 0.02,
        ease: "power2.in",
      });
    }
    prevOpen.current = openMobile;
  }, [isMobile, openMobile]);

  const handleLinkClick = (event: ReactMouseEvent<HTMLElement>, to: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (to === pathname) return;
    event.preventDefault();
    onNavigate(to);
  };

  return (
    <SidebarMenu className="gap-3">
      {NAV.map((item) => {
        if (item.kind === "group") {
          const isActive = item.children.some((child) => pathname.startsWith(child.to));

          if (collapsed) {
            return (
              <SidebarMenuItem data-sidebar-anim key={item.label}>
                <Menu>
                  <MenuTrigger render={<SidebarMenuButton isActive={isActive} />}>
                    <item.icon />
                    <span>{t(item.label)}</span>
                  </MenuTrigger>
                  <MenuPopup align="start" className="w-52" side="right">
                    {item.children.map((child) => (
                      <MenuItem key={child.to} onClick={() => onNavigate(child.to)}>
                        {t(child.label)}
                      </MenuItem>
                    ))}
                  </MenuPopup>
                </Menu>
              </SidebarMenuItem>
            );
          }

          return (
            <NavCollapsibleGroup
              key={item.label}
              label={t(item.label)}
              large={isMobile}
              icon={item.icon}
              isActive={isActive}
              children={item.children}
              onNavigate={onNavigate}
            />
          );
        }

        const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <SidebarMenuItem data-sidebar-anim key={item.to}>
            <SidebarMenuButton
              isActive={isActive}
              onClick={(event) => handleLinkClick(event, item.to)}
              render={<Link to={item.to} />}
              size={isMobile ? "lg" : "default"}
              tooltip={t(item.label)}
            >
              <item.icon className={cn(isMobile ? "size-6" : "size-4")} />
              {item.to === "/admin/inbox" && inboxUnread > 0 && (
                <SidebarMenuBadge className="h-5 min-w-5 rounded-full bg-destructive px-1 text-white tabular-nums">
                  {inboxUnread > 9 ? "9+" : inboxUnread}
                </SidebarMenuBadge>
              )}
              <span className={cn(isMobile && "text-lg")}>{t(item.label)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

function NavCollapsibleGroup({
  label,
  icon: Icon,
  large,
  isActive,
  children,
  onNavigate,
}: {
  label: string;
  icon?: React.ComponentType<React.ComponentProps<"svg">>;
  large?: boolean;
  isActive: boolean;
  children: { to: string; label: string }[];
  onNavigate: (to: string) => void;
}) {
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const [open, setOpen] = useState(isActive);

  // Only force-open when the group becomes active, so the user's manual toggle is respected.
  useEffect(() => {
    if (isActive) setOpen(true);
  }, [isActive]);

  const handleLinkClick = (event: ReactMouseEvent<HTMLElement>, to: string) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    if (to === pathname) return;
    event.preventDefault();
    onNavigate(to);
  };

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<SidebarMenuItem data-sidebar-anim />}
    >
      <CollapsibleTrigger
        render={<SidebarMenuButton isActive={isActive} size={large ? "lg" : "default"} tooltip={label} />}
      >
        {Icon ? (
          <Icon className={cn(large ? "size-6" : "size-4")} />
        ) : null}
        <span className={cn(large && "text-lg")}>{label}</span>
        <ChevronDownIcon
          className={cn("ms-auto transition-transform data-[panel-open]:rotate-180", large && "size-6")}
        />
      </CollapsibleTrigger>
      <CollapsiblePanel>
        <SidebarMenuSub className="gap-2">
          {children.map((child) => (
            <SidebarMenuSubItem data-sidebar-anim key={child.to}>
              <SidebarMenuSubButton
                isActive={pathname === child.to}
                onClick={(event) => handleLinkClick(event, child.to)}
                render={<Link to={child.to} />}
              >
                <span>{t(child.label)}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      </CollapsiblePanel>
    </Collapsible>
  );
}

function SidebarToggle() {
  const { toggleSidebar } = useSidebar();
  const { t } = useLanguage();

  return (
    <Button
      aria-label={t("Buka/tutup sidebar")}
      onClick={toggleSidebar}
      size="icon"
      variant="ghost"
    >
      <Bars3Icon />
    </Button>
  );
}

function SidebarCloseButton() {
  const { isMobile, setOpen, setOpenMobile } = useSidebar();
  const { t } = useLanguage();

  return (
    <Button
      aria-label={t("Tutup sidebar")}
      className="shrink-0"
      onClick={() => (isMobile ? setOpenMobile(false) : setOpen(false))}
      size="icon"
      type="button"
      variant="ghost"
    >
      <XMarkIcon />
    </Button>
  );
}

function MobileSidebarAutoClose() {
  const { pathname } = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();

  useEffect(() => {
    if (!isMobile) return;
    setOpenMobile(false);
  }, [isMobile, pathname, setOpenMobile]);

  return null;
}

export default function AdminLayout() {
  return (
    <UnsavedChangesProvider>
      <AdminLayoutContent />
    </UnsavedChangesProvider>
  );
}

function AdminLayoutContent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const user = session?.user;

  const { data: profile } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
  });
  const avatarUrl = profile?.logo_url || null;
  const inboxUnread = useRealtimeInboxCount();
  const username =
    (user as { username?: string | null } | null | undefined)?.username ?? user?.name ?? "admin";
  const [avatarFailed, setAvatarFailed] = useState(false);
  const showAvatar = Boolean(avatarUrl) && !avatarFailed;

  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery("max-md");
  const {
    flightRef,
    flightAvatarRef,
    flightLogoWrapRef,
    flightRingRef,
    flightLoadingRef,
    flightTypingRef,
    flightTypingRowRef,
    caption,
    active,
    start,
    playEntrance,
  } = useDashboardTransition({ navigate, pathname, rootRef, username, isMobile });

  const requestLeave = useRequestLeave();

  const go = useCallback(
    (to: string) => {
      if (to === pathname) return;
      requestLeave(() => start(to));
    },
    [pathname, requestLeave, start],
  );

  const handleLogoClick = useCallback(
    (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      if (pathname === "/admin") return;
      event.preventDefault();
      go("/admin");
    },
    [go, pathname],
  );

  const entrancePlayed = useRef(false);
  useLayoutEffect(() => {
    if (entrancePlayed.current) return;
    entrancePlayed.current = true;
    playEntrance();
  }, [playEntrance]);

  async function handleLogout() {
    resetWelcomeEntrance();
    await authClient.signOut();
    navigate("/admin/login");
  }

  return (
    <>
      <SidebarProvider className="bg-sidebar" ref={rootRef}>
        <MobileSidebarAutoClose />
        <Sidebar collapsible="icon" variant="floating">
          {isMobile ? (
            <SidebarHeader className="p-2">
              <div className="flex justify-end">
                <SidebarCloseButton />
              </div>
            </SidebarHeader>
          ) : (
            <SidebarHeader className="p-2">
              <Link className="flex w-full items-center gap-3" onClick={handleLogoClick} to="/admin">
                <Avatar
                  className="size-10 shrink-0 rounded-xl transition-[width,height,border-radius] duration-300 group-data-[collapsible=icon]:size-8"
                  data-sidebar-logo
                >
                  {showAvatar ? (
                    <AvatarImage
                      alt={user?.name ?? ""}
                      onError={() => setAvatarFailed(true)}
                      src={avatarUrl ?? undefined}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl">
                    <UserIcon className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div
                  className="grid min-w-0 flex-1 overflow-hidden text-left leading-tight transition-[opacity,translate,width,filter] duration-300 group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:flex-none group-data-[collapsible=icon]:-translate-x-2 group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:blur-[2px]"
                  data-sidebar-anim
                >
                  <span className="truncate font-medium text-sm">Portofolio CMS</span>
                  <span className="truncate text-muted-foreground text-xs">{username}</span>
                </div>
              </Link>
            </SidebarHeader>
          )}

          <SidebarContent>
            <SidebarGroup className="pt-4">
              <SidebarGroupContent>
                <SidebarNav inboxUnread={inboxUnread} onNavigate={go} />
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

      <SidebarInset
        className="mt-2 h-[calc(100svh-0.5rem)] overflow-x-hidden overflow-y-auto rounded-tl-3xl bg-background shadow-sm/5"
        data-transition-frame
      >
        <header
          className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-4"
          data-topbar-anim
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-background/50 backdrop-blur-2xl backdrop-saturate-150"
            data-topbar-chrome
          />
          {!isMobile && <SidebarToggle />}
          {!isMobile && <TopbarBreadcrumb onNavigate={go} />}
          {isMobile && (
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="flex items-center justify-start">
                <SidebarToggle />
              </div>
              <Link
                aria-label="Portofolio CMS"
                className="flex items-center"
                onClick={handleLogoClick}
                to="/admin"
              >
                <Avatar className="size-9 shrink-0 rounded-xl ring-1 ring-border" data-sidebar-logo>
                  {showAvatar ? (
                    <AvatarImage
                      alt={user?.name ?? ""}
                      onError={() => setAvatarFailed(true)}
                      src={avatarUrl ?? undefined}
                    />
                  ) : null}
                  <AvatarFallback className="rounded-xl">
                    <UserIcon className="size-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <div className="flex items-center justify-end gap-1" data-topbar-chrome>
                <Button
                  aria-label={t("Kotak Masuk")}
                  className="relative shrink-0"
                  onClick={() => go("/admin/inbox")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <span className="relative grid size-5 place-items-center">
                    <InboxIcon className="size-4 !mx-0" />
                    {inboxUnread > 0 && (
                      <span className="pointer-events-none absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-0.5 text-[9px] font-semibold text-white">
                        {inboxUnread > 9 ? "9+" : inboxUnread}
                      </span>
                    )}
                  </span>
                </Button>
                <ProfileMenu mode="drawer" onLogout={handleLogout} user={user} />
              </div>
            </div>
          )}
          {!isMobile && (
            <div className="ms-auto flex items-center gap-1" data-topbar-chrome>
              <Button
                aria-label={t("Kotak Masuk")}
                className="relative shrink-0"
                onClick={() => go("/admin/inbox")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <span className="relative grid size-5 place-items-center">
                    <InboxIcon className="size-4 !mx-0" />
                    {inboxUnread > 0 && (
                      <span className="pointer-events-none absolute -top-1 -end-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-0.5 text-[9px] font-semibold text-white">
                        {inboxUnread > 9 ? "9+" : inboxUnread}
                      </span>
                    )}
                  </span>
                </Button>
                <ProfileMenu onLogout={handleLogout} user={user} />
            </div>
          )}
        </header>
        <main className={cn("p-4 lg:p-6", isMobile && "pb-24")}>
          <div data-transition-content>
            <Outlet context={{ navigateAnimated: go }} />
          </div>
        </main>
      </SidebarInset>


      {createPortal(
        <div
          aria-hidden="true"
          className={cn(
            "fixed inset-0 z-[70] grid place-items-center",
            active ? "pointer-events-auto" : "pointer-events-none",
          )}
        >
          <div className="relative grid place-items-center">
            <div ref={flightLogoWrapRef} className="relative grid place-items-center">
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 -rotate-90 text-primary"
                fill="none"
                viewBox="0 0 64 64"
              >
                <circle
                  ref={flightRingRef}
                  className="opacity-0"
                  cx="32"
                  cy="32"
                  r={RING_RADIUS}
                  stroke="currentColor"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={RING_CIRCUMFERENCE}
                  strokeLinecap="round"
                  strokeWidth="2"
                />
              </svg>
              <div
                ref={flightRef}
                className="hidden size-10 overflow-hidden rounded-xl bg-muted text-foreground"
              >
                <div ref={flightAvatarRef} className="size-full">
                  {showAvatar ? (
                    <img
                      alt=""
                      className="size-full object-cover"
                      onError={() => setAvatarFailed(true)}
                      src={avatarUrl ?? undefined}
                    />
                  ) : (
                    <span className="grid size-full place-items-center">
                      <UserIcon className="size-5 text-muted-foreground" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div
              ref={flightLoadingRef}
              className="absolute top-full left-1/2 mt-8 flex -translate-x-1/2 flex-col items-center gap-1 opacity-0"
            >
              <div className="w-[min(78vw,340px)] text-foreground">
                {caption ? (
                  <StrokeText
                    key={caption.nonce}
                    text={caption.text}
                    strokeColor="currentColor"
                    fillColor="currentColor"
                    strokeWidth={1.5}
                    drawDuration={caption.welcome ? 1.2 : 1}
                    fillDelay={0.18}
                    stagger={0.06}
                    fontSize={42}
                    fontWeight={600}
                    letterSpacing={0}
                    fillMode="fill"
                  />
                ) : null}
              </div>
              <span ref={flightTypingRowRef} className="flex items-center">
                <span ref={flightTypingRef} className="font-medium text-muted-foreground text-sm" />
                <span
                  aria-hidden="true"
                  className="ms-0.5 inline-block h-4 w-px animate-pulse bg-muted-foreground"
                />
              </span>
            </div>
          </div>
        </div>,
        document.body,
      )}
      </SidebarProvider>
    </>
  );
}
