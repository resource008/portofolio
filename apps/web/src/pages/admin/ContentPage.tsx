import { useCallback, useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownTrayIcon, EllipsisVerticalIcon, ExclamationCircleIcon, MagnifyingGlassIcon, NoSymbolIcon, TrashIcon } from "@heroicons/react/24/outline";
import type { HeroProfile } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { CONTENT_SECTIONS, DEFAULT_CONTENT_SECTION } from "@/lib/sections";
import { HIGHLIGHT_SKILL_OPTIONS } from "@/lib/highlight-skills";
import { resolveTechLogo, TECH_OPTIONS } from "@/lib/tech-logo";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";
import HeroProfileUploads from "@/components/admin/HeroProfileUploads";
import EducationSection from "@/components/admin/EducationSection";
import ExperienceSection from "@/components/admin/ExperienceSection";
import ProjectsSection from "@/components/admin/ProjectsSection";
import { useUnsavedChangesGuard } from "@/components/admin/unsaved-changes";
import { translate, useLanguage } from "@/lib/language";

interface SkillRow {
  name: string;
}

interface ContentForm {
  heading: string;
  subheading: string;
  description: string;
  logo_url: string;
  photo_url: string;
  cv_file_url: string;
  highlight_skills: SkillRow[];
  tech_stacks: SkillRow[];
}

const EMPTY: ContentForm = {
  heading: "",
  subheading: "",
  description: "",
  logo_url: "",
  photo_url: "",
  cv_file_url: "",
  highlight_skills: [],
  tech_stacks: [],
};

function toForm(profile: HeroProfile): ContentForm {
  return {
    heading: profile.heading ?? "",
    subheading: profile.subheading ?? "",
    description: profile.description ?? "",
    logo_url: profile.logo_url ?? "",
    photo_url: profile.photo_url ?? "",
    cv_file_url: profile.cv_file_url ?? "",
    highlight_skills: (profile.highlight_skills ?? []).map((s) => ({ name: s.name })),
    tech_stacks: (profile.tech_stacks ?? []).map((s) => ({ name: s.name })),
  };
}

function validateForm(form: ContentForm): string[] {
  const errors: string[] = [];
  if (!form.subheading.trim()) errors.push(translate("Subjudul (nama lengkap) wajib diisi."));
  form.highlight_skills.forEach((skill, index) => {
    if (!skill.name.trim()) errors.push(translate("Keahlian unggulan #{n} wajib diisi.", { n: index + 1 }));
  });
  form.tech_stacks.forEach((skill, index) => {
    if (!skill.name.trim()) errors.push(translate("Tech stack #{n} wajib dipilih.", { n: index + 1 }));
  });
  return errors;
}

export default function ContentPage() {
  const { t } = useLanguage();
  const { section } = useParams();
  const activeSection =
    CONTENT_SECTIONS.find((item) => item.id === section) ??
    CONTENT_SECTIONS.find((item) => item.id === DEFAULT_CONTENT_SECTION)!;
  const isHeroSection = activeSection.id === "hero";

  const queryClient = useQueryClient();
  const [form, setForm] = useState<ContentForm>(EMPTY);

  // Portal ke scroll container agar sticky bottom menempel di dasar layar.
  const [actionBarHost, setActionBarHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setActionBarHost(document.querySelector<HTMLElement>("[data-transition-frame]"));
  }, []);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "profile"],
    queryFn: () => apiGet<HeroProfile>("/profile"),
    enabled: isHeroSection,
  });

  useEffect(() => {
    if (!data) return;
    setForm(toForm(data));
  }, [data]);

  const isDirty = data ? JSON.stringify(form) !== JSON.stringify(toForm(data)) : false;

  const saveMutation = useMutation({
    mutationFn: (payload: ContentForm) => apiSend("PUT", "/admin/profile", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "profile"] });
      toastManager.add({
        title: translate("Tersimpan"),
        description: translate("Perubahan berhasil disimpan."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: translate("Gagal menyimpan"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const saveForm = useCallback(async () => {
    const nextErrors = validateForm(form);
    if (nextErrors.length > 0) {
      toastManager.add({
        title:
          nextErrors.length > 1
            ? translate("Ada {count} kolom yang perlu diperbaiki", { count: nextErrors.length })
            : translate("Ada 1 kolom yang perlu diperbaiki"),
        description: (
          <ul className="list-disc space-y-1 ps-4">
            {nextErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        ),
        type: "error",
      });
      throw new Error("Form tidak valid");
    }
    await saveMutation.mutateAsync(form);
  }, [form, saveMutation]);

  if (activeSection.id === "education") {
    return (
      <EducationSection description={t(activeSection.description)} title={t(activeSection.label)} />
    );
  }

  if (activeSection.id === "experience") {
    return (
      <ExperienceSection description={t(activeSection.description)} title={t(activeSection.label)} />
    );
  }

  if (activeSection.id === "projects") {
    return <ProjectsSection description={t(activeSection.description)} title={t(activeSection.label)} />;
  }

  const showForm = isHeroSection && !isLoading;

  return (
    <HeroGuard isDirty={isDirty} onSave={saveForm}>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold">{t(activeSection.label)}</h1>
          <p className="text-sm text-muted-foreground">{t(activeSection.description)}</p>
        </div>

        {error && (
          <Alert variant="error">
            <ExclamationCircleIcon />
            <AlertTitle>{t("Gagal memuat konten")}</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        )}

        {!isHeroSection ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t("Bagian ini akan ditambahkan kemudian.")}
          </p>
        ) : isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("Memuat…")}</p>
        ) : (
          <form
            className="space-y-5"
            id="hero-form"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void saveForm().catch(() => {});
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel>{t("Judul")}</FieldLabel>
                <Input
                  onChange={(e) => setForm({ ...form, heading: e.target.value })}
                  placeholder={t("mis. Halo, Saya")}
                  value={form.heading}
                />
              </Field>
              <Field>
                <FieldLabel>{t("Subjudul")}</FieldLabel>
                <Input
                  onChange={(e) => setForm({ ...form, subheading: e.target.value })}
                  placeholder={t("mis. Agus Pranata Marpaung")}
                  value={form.subheading}
                />
              </Field>
            </div>

            <HeroProfileUploads
              cvUrl={form.cv_file_url}
              logoUrl={form.logo_url}
              onCvChange={(url) => setForm({ ...form, cv_file_url: url })}
              onLogoChange={(url) => setForm({ ...form, logo_url: url })}
              onPhotoChange={(url) => setForm({ ...form, photo_url: url })}
              photoUrl={form.photo_url}
            />

            <Repeater
              emptyLabel={t("Tidak ada keahlian")}
              label={t("Keahlian Unggulan")}
              max={5}
              onChange={(rows) => setForm({ ...form, highlight_skills: rows })}
              options={HIGHLIGHT_SKILL_OPTIONS}
              placeholder={t("keahlian")}
              rows={form.highlight_skills}
            />

            <Repeater
              emptyLabel={t("Tidak ada Tech Stack")}
              label="Tech Stack"
              onChange={(rows) => setForm({ ...form, tech_stacks: rows })}
              options={TECH_OPTIONS}
              placeholder={t("teknologi")}
              rows={form.tech_stacks}
              showLogo
            />
          </form>
        )}
      </div>

      {showForm && actionBarHost && (
        createPortal(
          <div className="sticky bottom-0 z-30 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
            <div className="flex justify-end gap-2">
              <Button
                form="hero-form"
                loading={saveMutation.isPending}
                type="submit"
                variant="default"
              >
                {!saveMutation.isPending && <ArrowDownTrayIcon />}
                {t("Simpan")}
              </Button>
            </div>
          </div>,
          actionBarHost,
        )
      )}
    </HeroGuard>
  );
}

function HeroGuard({
  isDirty,
  onSave,
  children,
}: {
  isDirty: boolean;
  onSave: () => Promise<unknown>;
  children: ReactNode;
}) {
  useUnsavedChangesGuard({ isDirty, onSave });
  return <>{children}</>;
}

function Repeater({
  label,
  rows,
  onChange,
  max,
  showLogo = false,
  options = [],
  placeholder = "item",
  emptyLabel = "Belum ada item dipilih.",
}: {
  label: string;
  rows: SkillRow[];
  onChange: (rows: SkillRow[]) => void;
  max?: number;
  showLogo?: boolean;
  options?: string[];
  placeholder?: string;
  emptyLabel?: string;
}) {
  const { t } = useLanguage();
  const atMax = typeof max === "number" && rows.length >= max;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const selected = rows.map((row) => row.name);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? options.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function handleSelectionChange(next: string[]) {
    const allowed = typeof max === "number" ? next.slice(0, max) : next;
    const set = new Set(allowed);
    const kept = rows.filter((row) => set.has(row.name));
    const additions = allowed
      .filter((name) => !rows.some((row) => row.name === name))
      .map((name) => ({ name }));
    onChange([...kept, ...additions]);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onChange(arrayMove(rows, Number(active.id), Number(over.id)));
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <span className="shrink-0 text-sm font-medium">{label}</span>

        <div className="ms-auto flex items-center gap-3">
          {typeof max === "number" && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {rows.length}/{max}
            </span>
          )}

          <Button
            aria-label={t("Cari {item}", { item: placeholder })}
            className="shrink-0"
            onClick={() => setOpen(true)}
            size="icon"
            type="button"
            variant="outline"
          >
            <MagnifyingGlassIcon />
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{t(emptyLabel)}</p>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
          <SortableContext items={rows.map((_, i) => i)} strategy={verticalListSortingStrategy}>
            <ul className="mt-3 space-y-2">
              {rows.map((row, index) => (
                <SortableRepeaterRow
                  id={index}
                  key={index}
                  onRemove={() => onChange(rows.filter((_, i) => i !== index))}
                  row={row}
                  showLogo={showLogo}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <Drawer onOpenChange={setOpen} open={open} position="bottom">
          <DrawerPopup showBar>
            <DrawerHeader>
              <DrawerTitle className="text-base">{label}</DrawerTitle>
            </DrawerHeader>
            <DrawerPanel className="space-y-3">
              <div className="flex items-center gap-3">
                <Input
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("Cari {item}…", { item: placeholder })}
                  value={query}
                />
                {typeof max === "number" && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {rows.length}/{max}
                  </span>
                )}
              </div>

              <div className="max-h-[50vh] space-y-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {t("Tidak ditemukan.")}
                  </p>
                ) : (
                  filtered.map((item) => {
                    const checked = selected.includes(item);
                    return (
                      <label
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-accent"
                        key={item}
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!checked && atMax}
                          onCheckedChange={(next) =>
                            handleSelectionChange(
                              next
                                ? [...selected, item]
                                : selected.filter((name) => name !== item),
                            )
                          }
                        />
                        {showLogo && <TechLogoPreview name={item} />}
                        <span className="min-w-0 flex-1 truncate">{item}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </DrawerPanel>
          </DrawerPopup>
        </Drawer>
    </div>
  );
}

function SortableRepeaterRow({
  id,
  row,
  showLogo,
  onRemove,
}: {
  id: number;
  row: SkillRow;
  showLogo: boolean;
  onRemove: () => void;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li
      className={cn(
        "flex items-center gap-2 rounded-md border bg-card/50 px-2 py-1.5",
        isDragging && "relative z-10 shadow-md",
      )}
      ref={setNodeRef}
      style={style}
    >
      <Button
        aria-label={t("Geser")}
        className="cursor-grab touch-none text-muted-foreground"
        size="icon-sm"
        variant="ghost"
        {...attributes}
        {...listeners}
      >
        <EllipsisVerticalIcon />
      </Button>
      {showLogo && <TechLogoPreview name={row.name} />}
      <span className="min-w-0 flex-1 truncate text-sm">{row.name}</span>
      <Button
        aria-label={t("Hapus")}
        onClick={onRemove}
        size="icon-sm"
        type="button"
        variant="destructive-outline"
      >
        <TrashIcon />
      </Button>
    </li>
  );
}

function TechLogoPreview({ name }: { name: string }) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-md border bg-white">
      {logo && !failed ? (
        <img
          alt=""
          className="size-5 object-contain"
          onError={() => setFailed(true)}
          src={logo}
        />
      ) : (
        <NoSymbolIcon className="size-4 text-muted-foreground" />
      )}
    </span>
  );
}
