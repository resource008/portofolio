import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MagnifyingGlassIcon, PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Project } from "@portofolio/shared";
import { apiGet } from "@/lib/api";
import { matchesProject } from "@/lib/project-search";
import { cn } from "@/lib/utils";
import { Dialog, DialogBackdrop, DialogPortal } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { ProjectDrawer } from "@/components/public/ProjectDrawer";

function ResultThumb({ project }: { project: Project }) {
  const image = project.media.find((item) => item.type === "image");
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
      {image ? (
        <img alt="" className="size-full object-cover" decoding="async" loading="lazy" src={image.url} />
      ) : (
        <PhotoIcon className="size-5 text-muted-foreground" />
      )}
    </span>
  );
}

/**
 * Pencarian proyek di header: ikon kaca pembesar → panel berisi kolom
 * pencarian dan daftar hasil. Memilih hasil membuka drawer proyek di halaman
 * yang sedang dibuka. Pintasan: "/" atau Ctrl/⌘+K. Navigasi hasil dengan
 * panah atas/bawah, Enter untuk membuka.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<Project | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Data proyek baru diambil saat panel pertama kali dibuka (berbagi cache dengan /projects).
  const { data, isLoading } = useQuery({
    queryKey: ["home", "projects"],
    queryFn: () => apiGet<Project[]>("/home/projects"),
    enabled: open,
  });

  const hasQuery = query.trim() !== "";

  // Hasil hanya muncul setelah pengguna mengetik; tanpa kata kunci panel hanya berisi kolom pencarian.
  const results = useMemo(
    () => (hasQuery ? (data ?? []).filter((project) => matchesProject(project, query)) : []),
    [data, query, hasQuery],
  );

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Pintasan keyboard global untuk membuka pencarian.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest("input, textarea, [contenteditable='true']");
      if ((event.key === "k" && (event.metaKey || event.ctrlKey)) || (event.key === "/" && !typing)) {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choose = (project: Project) => {
    setOpen(false);
    setSelected(project);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = Math.max(0, Math.min(results.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
      setActive(next);
      listRef.current?.children[next]?.scrollIntoView({ block: "nearest" });
    }
    if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <>
      <button
        aria-label="Cari proyek"
        className="grid size-9 place-items-center rounded-full border border-border bg-background/50 text-foreground/80 backdrop-blur-md transition-colors hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setOpen(true)}
        type="button"
      >
        <MagnifyingGlassIcon className="size-4.5" />
      </button>

      <Dialog
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
        open={open}
      >
        <DialogPortal>
          <DialogBackdrop />
          <DialogPrimitive.Popup
            aria-label="Cari proyek"
            className="fixed inset-x-3 top-4 z-50 mx-auto flex max-h-[min(36rem,calc(100svh-2rem))] max-w-xl flex-col overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-2xl outline-none transition-[opacity,translate,scale] duration-200 ease-out data-ending-style:-translate-y-2 data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:scale-[0.98] data-starting-style:opacity-0 sm:top-[12svh]"
          >
            <div className={cn("flex items-center gap-2 px-4", hasQuery && "border-b")}>
              <MagnifyingGlassIcon className="size-5 shrink-0 text-muted-foreground" />
              <input
                aria-label="Kata kunci"
                autoFocus
                className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Cari judul, kategori, atau teknologi…"
                // type="text" (bukan "search") agar tidak ada tombol × bawaan browser
                // yang bertumpuk dengan tombol tutup panel.
                enterKeyHint="search"
                type="text"
                value={query}
              />
              <DialogPrimitive.Close
                aria-label="Tutup"
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <XMarkIcon className="size-5" />
              </DialogPrimitive.Close>
            </div>

            {hasQuery && (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {isLoading ? (
                  <div className="grid place-items-center py-10">
                    <Spinner className="size-5 text-muted-foreground" />
                  </div>
                ) : results.length > 0 ? (
                  <ul ref={listRef} role="listbox">
                    {results.map((project, index) => (
                      <li aria-selected={index === active} key={project.id} role="option">
                        <button
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                            index === active ? "bg-muted" : "hover:bg-muted/60",
                          )}
                          onClick={() => choose(project)}
                          onMouseEnter={() => setActive(index)}
                          type="button"
                        >
                          <ResultThumb project={project} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-sm">{project.title}</span>
                            <span className="block truncate text-muted-foreground text-xs">
                              {[project.category, ...project.tech_stacks.slice(0, 3)]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-10 text-center text-muted-foreground text-sm">
                    Tidak ada proyek yang cocok dengan "{query}".
                  </p>
                )}
              </div>
            )}
          </DialogPrimitive.Popup>
        </DialogPortal>
      </Dialog>

      <ProjectDrawer onClose={() => setSelected(null)} project={selected} />
    </>
  );
}
