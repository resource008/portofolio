import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatBubbleLeftIcon, ExclamationCircleIcon, HandThumbUpIcon, PhotoIcon, RectangleStackIcon, ServerIcon, ShareIcon } from "@heroicons/react/24/outline";
import type { DashboardStats } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { authClient } from "@/lib/auth-client";
import { cn, formatNumber } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardPanel,
  CardTitle,
} from "@/components/ui/card";
import { Meter, MeterIndicator, MeterTrack } from "@/components/ui/meter";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { t } = useLanguage();
  const { data: session } = authClient.useSession();
  const userName = session?.user?.name?.split(" ")[0] ?? "Admin";

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "dashboard-stats"],
    queryFn: () => apiGet<DashboardStats>("/admin/dashboard/stats"),
  });

  const summary = data?.summary;
  const media = data?.media_overview;
  const storageDetails = data?.storage_details;

  const storageUsed = media?.storage_used_mb ?? 0;
  const storageLimit = media?.storage_limit_mb ?? 0;

  const imageSizeMb = storageDetails?.images.size_mb ?? 0;
  const videoSizeMb = storageDetails?.videos.size_mb ?? 0;
  const documentSizeMb = storageDetails?.documents.size_mb ?? 0;

  const storageSegments = [
    {
      key: "image",
      label: t("Gambar"),
      value: imageSizeMb,
      count: storageDetails?.images.count ?? 0,
      className: "text-sky-500",
      dot: "bg-sky-500",
    },
    {
      key: "video",
      label: "Video",
      value: videoSizeMb,
      count: storageDetails?.videos.count ?? 0,
      className: "text-violet-500",
      dot: "bg-violet-500",
    },
    {
      key: "document",
      label: t("Dokumen"),
      value: documentSizeMb,
      count: storageDetails?.documents.count ?? 0,
      className: "text-emerald-500",
      dot: "bg-emerald-500",
    },
  ];

  const stats = [
    { label: t("Jumlah Suka"), value: summary?.total_likes ?? 0, icon: HandThumbUpIcon },
    { label: t("Dibagikan"), value: summary?.total_shares ?? 0, icon: ShareIcon },
    { label: t("Total Proyek"), value: summary?.total_projects ?? 0, icon: RectangleStackIcon },
    { label: t("Pesan Belum Dibaca"), value: summary?.total_unread_messages ?? 0, icon: ChatBubbleLeftIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("Halo, {name} 👋", { name: userName })}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Berikut ringkasan aktivitas portofolio kamu.")}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat statistik")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardPanel>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="size-5" />
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {isLoading ? <Skeleton className="h-7 w-16" /> : formatNumber(value)}
              </div>
            </CardPanel>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("Penyimpanan")}</CardTitle>
            <CardDescription>{t("Kapasitas penyimpanan dan rincian media yang tersimpan.")}</CardDescription>
          </CardHeader>
          <CardPanel className="space-y-3 pt-0">
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ServerIcon className="size-4" />
                  {t("Kapasitas")}
                </span>
                <div className="text-sm font-medium">
                  {isLoading ? (
                    <Skeleton className="h-4 w-24" />
                  ) : (
                    `${formatNumber(storageUsed)} / ${formatNumber(storageLimit)} MB`
                  )}
                </div>
              </div>
              <Meter
                className="mt-2"
                max={storageLimit > 0 ? storageLimit : 1}
                value={storageLimit > 0 ? storageUsed : 0}
              >
                <MeterTrack className="h-2 rounded-full">
                  <MeterIndicator
                    className={cn(
                      "rounded-full",
                      storageLimit > 0 &&
                        storageUsed / storageLimit >= 0.9 &&
                        "bg-destructive",
                    )}
                  />
                </MeterTrack>
              </Meter>
            </div>

            <div className="space-y-3">
              <div className="grid place-items-center py-2">
                {isLoading ? (
                  <Skeleton className="size-44 rounded-full" />
                ) : (
                  <StorageDonut segments={storageSegments} />
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                {storageSegments.map((seg) => (
                  <span
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                    key={seg.key}
                  >
                    <span className={cn("size-2.5 rounded-full", seg.dot)} />
                    {seg.label}
                  </span>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MediaRow
                  icon={PhotoIcon}
                  label={t("Foto Proyek")}
                  loading={isLoading}
                  value={media?.project_photos_count ?? 0}
                />
                <MediaRow
                  icon={PhotoIcon}
                  label={t("Foto Pengalaman")}
                  loading={isLoading}
                  value={media?.experience_photos_count ?? 0}
                />
              </div>
            </div>
          </CardPanel>
        </Card>
      </div>
    </div>
  );
}

function MediaRow({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof PhotoIcon;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </span>
      <div className="text-sm font-medium">
        {loading ? <Skeleton className="h-4 w-10" /> : formatNumber(value)}
      </div>
    </div>
  );
}

/** Donat chart berwarna; rincian (jumlah & ukuran) tampil saat hover. */
function StorageDonut({
  segments,
}: {
  segments: {
    key: string;
    label: string;
    count: number;
    value: number;
    className: string;
    dot: string;
  }[];
}) {
  const { t } = useLanguage();
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const SIZE = 280;
  const CENTER = SIZE / 2;
  const STROKE = 16;
  const RADIUS = 66;
  const TOOLTIP_R = 122;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  // Sudut donat: 0 = posisi 12 jam, searah jarum jam.
  const polar = (r: number, angle: number) => ({
    x: CENTER + r * Math.sin(angle),
    y: CENTER - r * Math.cos(angle),
  });

  let acc = 0;
  const arcs = segments.map((seg) => {
    const span = total > 0 ? (seg.value / total) * 2 * Math.PI : 0;
    const arc = {
      ...seg,
      span,
      start: acc,
      mid: acc + span / 2,
    };
    acc += span;
    return arc;
  });
  const visibleArcs = arcs.filter((arc) => arc.value > 0);
  const hovered = visibleArcs.find((arc) => arc.key === hoveredKey) ?? null;
  const tip = hovered ? polar(TOOLTIP_R, hovered.mid) : null;

  return (
    <div className="relative aspect-square w-full max-w-[280px]">
      <svg
        className="absolute inset-0 block h-full w-full overflow-visible"
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
      >
        {/* Ring dasar */}
        <circle
          className="stroke-muted/40"
          cx={CENTER}
          cy={CENTER}
          fill="none"
          r={RADIUS}
          strokeWidth={STROKE}
        />

        {/* Total terpakai di tengah */}
        <text
          className="fill-foreground"
          fontSize={20}
          fontWeight={600}
          textAnchor="middle"
          x={CENTER}
          y={CENTER - 2}
        >
          {formatSizeMb(total)}
        </text>
        <text
          className="fill-muted-foreground"
          fontSize={10}
          textAnchor="middle"
          x={CENTER}
          y={CENTER + 16}
        >
          {t("Terpakai")}
        </text>

        {/* Segmen donat, mulai dari atas (12 jam) */}
        {visibleArcs.length > 0 && (
          <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
            {visibleArcs.map((arc) => {
              const dash = (arc.value / total) * CIRCUMFERENCE;
              const offset = (arc.start / (2 * Math.PI)) * CIRCUMFERENCE;
              return (
                <circle
                  aria-label={`${arc.label}: ${formatNumber(arc.count)} file, ${formatSizeMb(arc.value)}`}
                  className={cn(arc.className, "cursor-pointer outline-none")}
                  cx={CENTER}
                  cy={CENTER}
                  fill="none"
                  key={arc.key}
                  onBlur={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(arc.key)}
                  onMouseEnter={() => setHoveredKey(arc.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  r={RADIUS}
                  role="img"
                  stroke="currentColor"
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                  strokeWidth={STROKE}
                  tabIndex={0}
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* Tooltip saat hover */}
      {hovered && tip && (
        <div
          className="pointer-events-none absolute z-10 w-max max-w-44 -translate-x-1/2 -translate-y-1/2 rounded-md border bg-popover px-3 py-1.5 text-xs shadow-md"
          style={{ left: `${(tip.x / SIZE) * 100}%`, top: `${(tip.y / SIZE) * 100}%` }}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <span className={cn("size-2.5 rounded-full", hovered.dot)} />
            {hovered.label}
          </div>
          <div className="mt-0.5 text-muted-foreground">
            {formatNumber(hovered.count)} file · {formatSizeMb(hovered.value)}
          </div>
        </div>
      )}
    </div>
  );
}

function formatSizeMb(mb: number): string {
  if (mb <= 0) return "0 MB";
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}
