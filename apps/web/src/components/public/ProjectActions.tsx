import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HeartIcon, ShareIcon } from "@heroicons/react/24/outline";
import { HeartIcon as HeartSolidIcon } from "@heroicons/react/24/solid";
import type { ProjectDetail } from "@portofolio/shared";
import { apiSend } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toastManager } from "@/components/ui/toast";
import { ClickSpark } from "@/components/ui/ClickSpark";
import { Counter } from "@/components/ui/Counter";
import { motion } from "motion/react";

const LIKED_KEY = "liked-projects";

function readLiked(): number[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(LIKED_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLiked(ids: number[]) {
  try {
    localStorage.setItem(LIKED_KEY, JSON.stringify(ids));
  } catch {
    // Storage diblokir: like tetap tercatat, hanya tidak diingat.
  }
}

function track(event: "like" | "unlike" | "share", projectId: number) {
  return apiSend("POST", "/analytics/track", {
    event_type: event,
    target_type: "project",
    target_id: projectId,
  });
}

export const glassPillClass =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-white/40 bg-white/45 px-3 font-medium text-foreground text-sm backdrop-blur-md backdrop-saturate-150 dark:border-white/15 dark:bg-black/30 dark:text-white";

const buttonClass =
  `${glassPillClass} transition-colors hover:bg-white/60 dark:hover:bg-black/45`;

export function ProjectActions({ project, className }: { project: ProjectDetail; className?: string }) {
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(() => readLiked().includes(project.id));
  const [likes, setLikes] = useState(project.likes_count);
  const [shareTaps, setShareTaps] = useState(0);

  const toggleLike = async () => {
    const next = !liked;
    const delta = next ? 1 : -1;
    const apply = (on: boolean, change: number) => {
      setLiked(on);
      setLikes((count) => Math.max(0, count + change));
      const others = readLiked().filter((id) => id !== project.id);
      saveLiked(on ? [...others, project.id] : others);
    };
    apply(next, delta);
    try {
      await track(next ? "like" : "unlike", project.id);
      queryClient.setQueryData<ProjectDetail>(["project", project.slug], (old) =>
        old ? { ...old, likes_count: Math.max(0, old.likes_count + delta) } : old,
      );
    } catch (err) {
      apply(!next, -delta);
      toastManager.add({
        title: next ? "Gagal menyukai proyek" : "Gagal membatalkan suka",
        description: (err as Error).message,
        type: "error",
      });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/projects/${project.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: project.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toastManager.add({ title: "Tautan disalin", type: "success" });
      }
    } catch (err) {
      // Pengguna membatalkan dialog share — tidak dihitung.
      if ((err as Error).name === "AbortError") return;
      toastManager.add({ title: "Gagal membagikan", description: (err as Error).message, type: "error" });
      return;
    }
    track("share", project.id).catch(() => {});
  };

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <ClickSpark active={!liked}>
        <button
          aria-label={liked ? "Batal sukai proyek" : "Sukai proyek"}
          aria-pressed={liked}
          className={buttonClass}
          onClick={toggleLike}
          type="button"
        >
          <motion.span
            animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            className="inline-flex"
            key={String(liked)}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            {liked ? (
              <HeartSolidIcon className="size-4.5 text-rose-500" />
            ) : (
              <HeartIcon className="size-4.5" />
            )}
          </motion.span>
          <Counter value={likes} />
        </button>
      </ClickSpark>
      <ClickSpark sparkColor="#38bdf8">
        <button
          aria-label="Bagikan proyek"
          className={buttonClass}
          onClick={() => {
            setShareTaps((n) => n + 1);
            share();
          }}
          type="button"
        >
          <motion.span
            animate={shareTaps > 0 ? { scale: [1, 1.3, 1], rotate: [0, -12, 0] } : undefined}
            className="inline-flex"
            key={shareTaps}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <ShareIcon className="size-4.5" />
          </motion.span>
        </button>
      </ClickSpark>
    </div>
  );
}
