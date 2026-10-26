import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AcademicCapIcon, ArrowUpRightIcon, ArrowUpTrayIcon, BookOpenIcon, CalendarDaysIcon, ChevronDownIcon, DocumentTextIcon, ExclamationCircleIcon, LinkIcon, PencilIcon, PlusIcon, TrashIcon, TrophyIcon } from "@heroicons/react/24/outline";
import type { Education, EducationContent } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { useIsMobile, useMediaQuery } from "@/hooks/use-media-query";
import { domainFromLogo, logoFromDomain } from "@/lib/campus-logo";
import { CERT_ORGANIZATIONS, resolveCertLogo } from "@/lib/cert-logo";
import {
  registerEducationEditorReset,
  setEducationEditorMode,
} from "@/lib/education-editor-state";
import { cn, isDocumentFile } from "@/lib/utils";
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerFooter,
  DrawerHeader,
  DrawerPanel,
  DrawerPopup,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import ConfirmDialog from "@/components/admin/confirm-dialog";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import MediaPreviewDialog from "@/components/admin/MediaPreviewDialog";
import {
  useRequestLeave,
  useUnsavedChangesGuard,
} from "@/components/admin/unsaved-changes";
import { SwipeActionButton, SwipeActions } from "@/components/admin/SwipeActions";
import { EmptyBoxIllustration } from "@/components/EmptyBoxIllustration";
import {
  MonthYearPicker,
  MonthYearRange,
} from "@/components/admin/history-fields";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";

interface AchievementForm {
  organization: string;
  title: string;
  period: string;
  documents: string[];
}

interface EducationForm {
  id?: number;
  logo_url: string;
  institution_name: string;
  degree_major: string;
  range_date: string;
  gpa: string;
  description: string;
  is_current: boolean;
  achievements: AchievementForm[];
}

const EMPTY: EducationForm = {
  logo_url: "",
  institution_name: "",
  degree_major: "",
  range_date: "",
  gpa: "",
  description: "",
  is_current: false,
  achievements: [],
};

const EMPTY_ACHIEVEMENT: AchievementForm = {
  organization: "",
  title: "",
  period: "",
  documents: [],
};

function toForm(item: Education): EducationForm {
  return {
    id: item.id,
    logo_url: item.logo_url ?? "",
    institution_name: item.institution_name,
    degree_major: item.degree_major,
    range_date: item.range_date,
    gpa: item.gpa != null ? String(item.gpa) : "",
    description: item.description ?? "",
    is_current: item.is_current,
    achievements: item.achievements.map((achievement) => ({
      organization: achievement.organization ?? "",
      title: achievement.title,
      period: achievement.period ?? "",
      documents: achievement.documents ?? [],
    })),
  };
}

export default function EducationSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "educations"],
    queryFn: () => apiGet<EducationContent>("/educations"),
  });

  const [editing, setEditing] = useState<EducationForm | null>(null);
  const [baseline, setBaseline] = useState<EducationForm | null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Education | null>(null);
  const [expandedIds, setExpandedIds] = useState<Education["id"][]>([]);
  const toggleExpanded = (id: Education["id"]) =>
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  const [previewCert, setPreviewCert] = useState<{
    photos: string[];
    index: number;
    title: string;
  } | null>(null);
  const [tab, setTab] = useState<"instansi" | "sertifikasi">("instansi");
  const [view, setView] = useState<"list" | "form">("list");
  const isMobile = useIsMobile();
  const isLargeScreen = useMediaQuery("lg");
  const requestLeave = useRequestLeave();

  // Portal ke scroll container agar sticky bottom menempel di dasar layar.
  const [actionBarHost, setActionBarHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setActionBarHost(document.querySelector<HTMLElement>("[data-transition-frame]"));
  }, []);

  function openEditor(form: EducationForm) {
    setEditing(form);
    setBaseline(form);
    setTab("instansi");
    if (isLargeScreen) {
      setView("form");
    } else {
      setOpen(true);
    }
  }

  const saveMutation = useMutation({
    mutationFn: (form: EducationForm) => {
      const payload = {
        ...form,
        achievements: form.achievements.map((achievement) => ({
          ...achievement,
          documents: achievement.documents
            .map((doc) => doc.trim())
            .filter(Boolean),
        })),
      };
      return form.id
        ? apiSend<{ id: number }>("PUT", `/admin/educations/${form.id}`, payload)
        : apiSend<{ id: number }>("POST", "/admin/educations", payload);
    },
    onSuccess: (saved, form) => {
      // Item baru mendapat id agar simpan berikutnya memperbarui item yang sama.
      const next = { ...form, id: form.id ?? saved.id };
      setEditing(next);
      setBaseline(next);
      queryClient.invalidateQueries({ queryKey: ["admin", "educations"] });
      toastManager.add({
        title: t("Disimpan sebagai draf"),
        description: t("Perubahan telah disimpan."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: t("Gagal menyimpan"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiSend("DELETE", `/admin/educations/${id}`),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "educations"] });
      toastManager.add({
        title: t("Terhapus"),
        description: t("Data pendidikan berhasil dihapus."),
        type: "success",
      });
    },
    onError: (error) => {
      toastManager.add({
        title: t("Gagal menghapus"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  const items = data?.items ?? [];

  const formActive = open || (isLargeScreen && view === "form");
  const isDirty =
    formActive &&
    editing !== null &&
    baseline !== null &&
    JSON.stringify(editing) !== JSON.stringify(baseline);

  useUnsavedChangesGuard({
    isDirty,
    onSave: () => (editing ? saveMutation.mutateAsync(editing) : Promise.resolve()),
    autoSaveOnLeave: true,
  });

  function closeForm() {
    setOpen(false);
    setView("list");
    setEditing(null);
    setBaseline(null);
  }

  useEffect(() => {
    setEducationEditorMode(editing ? (editing.id ? "edit" : "create") : null);
    return () => setEducationEditorMode(null);
  }, [editing]);

  const requestLeaveRef = useRef(requestLeave);
  requestLeaveRef.current = requestLeave;
  useEffect(() => {
    registerEducationEditorReset(() =>
      requestLeaveRef.current(() => {
        setOpen(false);
        setView("list");
        setEditing(null);
        setBaseline(null);
      }),
    );
    return () => registerEducationEditorReset(null);
  }, []);

  useEffect(() => {
    if (isLargeScreen && open) {
      setOpen(false);
      if (editing) setView("form");
    } else if (!isLargeScreen && view === "form" && editing) {
      setView("list");
      setOpen(true);
    }
  }, [editing, isLargeScreen, open, view]);

  if (isLargeScreen && view === "form" && editing) {
    return (
      <div className="space-y-6">
        <InlineEducationForm
          description={description}
          editing={editing}
          onSubmit={() => saveMutation.mutate(editing)}
          saveError={saveMutation.error}
          setEditing={setEditing}
        />
        {actionBarHost &&
          createPortal(
            <div className="sticky bottom-0 z-30 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur lg:px-6">
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => requestLeave(closeForm)}
                  type="button"
                  variant="ghost"
                >
                  {t("Batal")}
                </Button>
                <Button form="education-form" loading={saveMutation.isPending} type="submit">
                  {t("Simpan")}
                </Button>
              </div>
            </div>,
            actionBarHost,
          )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl">{title}</h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      {error && (
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat data pendidikan")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <Card className="p-2">
          <div className="grid place-items-center p-6">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        </Card>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia>
              <EmptyBoxIllustration className="size-28 opacity-70" />
            </EmptyMedia>
            <EmptyTitle>{t("Belum ada pendidikan")}</EmptyTitle>
            <EmptyDescription>{t("Tambahkan riwayat pendidikan kamu.")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card className="overflow-hidden" key={item.id}>
                <SwipeActions
                  actions={
                    <>
                      <SwipeActionButton
                        aria-label={t("Ubah")}
                        className="bg-accent text-foreground"
                        onClick={() => openEditor(toForm(item))}
                      >
                        <PencilIcon className="size-4" />
                      </SwipeActionButton>
                      <SwipeActionButton
                        aria-label={t("Hapus")}
                        className="bg-destructive text-white"
                        onClick={() => setPendingDelete(item)}
                      >
                        <TrashIcon className="size-4" />
                      </SwipeActionButton>
                    </>
                  }
                  enabled={isMobile}
                >
                <Accordion
                  onValueChange={() => toggleExpanded(item.id)}
                  value={expandedIds.includes(item.id) ? ["open"] : []}
                >
                <AccordionItem className="border-b-0" value="open">
                <div className="flex items-center gap-2 p-3">
                  <div className="min-w-0 flex-1">
                  <AccordionTrigger
                    className="min-w-0 items-center gap-3 py-0 font-normal disabled:opacity-100"
                    hideIndicator
                    disabled={item.achievements.length === 0}
                  >
                    {item.logo_url ? (
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
                        <img
                          alt=""
                          className="size-6 object-contain"
                          src={item.logo_url}
                        />
                      </span>
                    ) : (
                      <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-muted">
                        <AcademicCapIcon className="size-5 text-muted-foreground" />
                      </span>
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-sm">
                        {item.institution_name}
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-muted-foreground text-xs">
                        <span className="flex min-w-0 items-center gap-1">
                          <BookOpenIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{item.degree_major}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="size-3.5 shrink-0" />
                          {item.range_date}
                          {item.is_current ? ` - ${t("Sekarang")}` : ""}
                        </span>
                        {item.gpa && (
                          <span className="flex items-center gap-1">
                            <TrophyIcon className="size-3.5 shrink-0" />
                            {t("IPK")} {item.gpa}
                          </span>
                        )}
                        {item.achievements.length > 0 && (
                          <span className="flex items-center gap-1">
                            <DocumentTextIcon className="size-3.5 shrink-0" />
                            {t("{count} sertifikat", { count: item.achievements.length })}
                          </span>
                        )}
                      </span>
                    </span>
                  </AccordionTrigger>
                  </div>

                  {!isMobile && (
                    <>
                      <Button
                        aria-label={t("Ubah")}
                        onClick={() => openEditor(toForm(item))}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={t("Hapus")}
                        onClick={() => setPendingDelete(item)}
                        size="icon-sm"
                        variant="destructive-outline"
                      >
                        <TrashIcon />
                      </Button>
                    </>
                  )}

                  {item.achievements.length > 0 && (
                    <Button
                      aria-expanded={expandedIds.includes(item.id)}
                      aria-label={t("Tampilkan sertifikat")}
                      onClick={() => toggleExpanded(item.id)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <ChevronDownIcon
                        className={cn(
                          "transition-transform duration-200",
                          expandedIds.includes(item.id) && "rotate-180",
                        )}
                      />
                    </Button>
                  )}
                </div>

                {item.achievements.length > 0 && (
                        <AccordionPanel className="pb-3">
                          <div className="grid grid-cols-1 gap-2 px-3">
                            {item.achievements.map((achievement) => {
                              const icon = certificateIcon(
                                achievement.organization,
                                achievement.documents.find((doc) => !isDocumentFile(doc)),
                              );
                              return (
                                <div
                                  className="flex items-center gap-3 rounded-lg bg-muted/40 p-3"
                                  key={achievement.id}
                                >
                                  <CertIcon src={icon} />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate font-medium text-sm">
                                      {achievement.title}
                                    </span>
                                    <span className="block truncate text-muted-foreground text-xs">
                                      {achievement.organization ?? ""}
                                      {achievement.period
                                        ? `${achievement.organization ? " · " : ""}${achievement.period}`
                                        : ""}
                                    </span>
                                  </span>
                                  {achievement.documents.length > 0 && (
                                    <div className="flex shrink-0 items-center gap-1">
                                      {achievement.documents.map((doc, index) =>
                                        isDocumentFile(doc) ? (
                                          <button
                                            aria-label={t("Pratinjau {title}", { title: achievement.title })}
                                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            key={index}
                                            onClick={() => {
                                              const photos = achievement.documents.filter(
                                                (document) => isDocumentFile(document),
                                              );
                                              setPreviewCert({
                                                photos,
                                                index: photos.indexOf(doc),
                                                title: achievement.title,
                                              });
                                            }}
                                            title={t("Pratinjau dokumen")}
                                            type="button"
                                          >
                                            <DocumentTextIcon className="size-4" />
                                          </button>
                                        ) : (
                                          <a
                                            aria-label={t("Buka kredensial {title}", { title: achievement.title })}
                                            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                            href={doc}
                                            key={index}
                                            rel="noreferrer"
                                            target="_blank"
                                            title={t("Buka tautan")}
                                          >
                                            <ArrowUpRightIcon className="size-4" />
                                          </a>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </AccordionPanel>
                )}
                </AccordionItem>
                </Accordion>
                </SwipeActions>
            </Card>
          ))}
        </div>
      )}
      <Button
        aria-label={t("Tambah pendidikan")}
        className="fixed right-6 bottom-6 z-40 size-16 sm:size-16 rounded-full shadow-lg before:rounded-full"
        onClick={() => openEditor({ ...EMPTY, achievements: [] })}
        size="icon"
        type="button"
      >
        <PlusIcon className="size-7" />
      </Button>

      <Drawer
        onOpenChange={(next) => {
          if (next) {
            setOpen(true);
            return;
          }
          requestLeave(() => setOpen(false));
        }}
        onOpenChangeComplete={(next) => {
          if (!next) setEditing(null);
        }}
        open={open}
        position="bottom"
      >
        <DrawerPopup
          className="justify-self-center w-full max-w-2xl"
          nestedVariant="side"
          showCloseButton
        >
          {editing && (
            <Tabs
              className="min-h-0 flex-1"
              onValueChange={(value) => setTab(value as "instansi" | "sertifikasi")}
              value={tab}
            >
              <DrawerHeader>
                <DrawerTitle>{editing.id ? t("Ubah Pendidikan") : t("Tambah Pendidikan")}</DrawerTitle>
                <TabsList className="mt-2 self-center sm:hidden">
                  <TabsTab value="instansi">{t("Instansi Pendidikan")}</TabsTab>
                  <TabsTab value="sertifikasi">{t("Sertifikasi")}</TabsTab>
                </TabsList>
              </DrawerHeader>

              <form
                className="flex min-h-0 flex-1 flex-col"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveMutation.mutate(editing);
                }}
              >
                <DrawerPanel className="space-y-4 pb-8" scrollFade={false}>
                  <div className="grid grid-cols-[minmax(0,1fr)] sm:block">
                    <div
                      className={cn(
                        "col-start-1 row-start-1",
                        tab === "instansi" ? "block sm:block" : "hidden sm:block",
                      )}
                    >
                      <InstansiFields editing={editing} setEditing={setEditing} />
                    </div>

                    <div
                      className={cn(
                        "col-start-1 row-start-1 space-y-4 sm:pt-4",
                        tab === "sertifikasi" ? "block sm:block" : "hidden sm:block",
                      )}
                    >
                      <SertifikasiEditor
                        editing={editing}
                        headerClassName="sticky top-0 z-20 -mx-6 flex items-center justify-between border-b bg-popover px-6 py-3"
                        isMobile={isMobile}
                        setEditing={setEditing}
                      />
                    </div>
                  </div>

                  {saveMutation.error && (
                    <p className="text-destructive-foreground text-sm">
                      {(saveMutation.error as Error).message}
                    </p>
                  )}
                </DrawerPanel>

                <DrawerFooter>
                  <Button
                    onClick={() => requestLeave(() => setOpen(false))}
                    type="button"
                    variant="ghost"
                  >
                    {t("Batal")}
                  </Button>
                  <Button loading={saveMutation.isPending} type="submit">
                    {t("Simpan")}
                  </Button>
                </DrawerFooter>
              </form>
            </Tabs>
          )}
        </DrawerPopup>
      </Drawer>

      <ConfirmDialog
        description={
          pendingDelete
            ? t('Data pendidikan "{name}" akan dihapus permanen.', { name: pendingDelete.institution_name })
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
        onOpenChange={(next) => {
          if (!next) setPendingDelete(null);
        }}
        open={pendingDelete !== null}
        title={t("Hapus pendidikan?")}
      />

      <MediaPreviewDialog
        index={previewCert?.index ?? 0}
        onClose={() => setPreviewCert(null)}
        onIndexChange={(index) =>
          setPreviewCert((current) => (current ? { ...current, index } : current))
        }
        open={previewCert !== null}
        photos={previewCert?.photos}
        title={previewCert?.title ?? t("Pratinjau Sertifikat")}
        url={previewCert ? (previewCert.photos[previewCert.index] ?? null) : null}
      />
    </div>
  );
}

type EducationSetter = Dispatch<SetStateAction<EducationForm | null>>;

function InlineEducationForm({
  description,
  editing,
  onSubmit,
  saveError,
  setEditing,
}: {
  description: string;
  editing: EducationForm;
  onSubmit: () => void;
  saveError: Error | null;
  setEditing: EducationSetter;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex h-[calc(100svh-5rem)] flex-col gap-4 lg:h-[calc(100svh-5.5rem)]">
      <div>
        <h1 className="font-semibold text-xl">
          {editing.id ? t("Ubah Pendidikan") : t("Tambah Pendidikan")}
        </h1>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,3fr)_minmax(0,2fr)] grid-rows-[minmax(0,1fr)] items-stretch gap-4">
        <form
          className="flex min-h-0 flex-col gap-4 overflow-y-auto"
          id="education-form"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <InstansiFields editing={editing} fill setEditing={setEditing} />
          {saveError && (
            <p className="text-destructive-foreground text-sm">
              {(saveError as Error).message}
            </p>
          )}
        </form>

        <section className="flex max-h-[55%] flex-col self-start overflow-y-auto rounded-xl border bg-card">
          <SertifikasiEditor
            editing={editing}
            contentClassName="p-4"
            headerClassName="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b bg-card px-4 py-3"
            isMobile={false}
            setEditing={setEditing}
          />
        </section>
      </div>
    </div>
  );
}

function InstansiFields({
  editing,
  setEditing,
  fill = false,
}: {
  editing: EducationForm;
  setEditing: EducationSetter;
  fill?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className={cn(fill ? "flex min-h-0 flex-1 flex-col gap-4" : "space-y-4")}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("Logo Instansi")}</FieldLabel>
          <div className="flex w-full items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
              {editing.logo_url ? (
                <img alt="" className="size-3 object-contain" src={editing.logo_url} />
              ) : (
                <AcademicCapIcon className="size-3 text-muted-foreground" />
              )}
            </span>
            <Input
              defaultValue={domainFromLogo(editing.logo_url) ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, logo_url: logoFromDomain(e.target.value) ?? "" })
              }
              placeholder={t("domain kampus, mis. del.ac.id")}
            />
          </div>
        </Field>
        <Field>
          <FieldLabel>{t("Nama Instansi")}</FieldLabel>
          <Input
            onChange={(e) => setEditing({ ...editing, institution_name: e.target.value })}
            required
            value={editing.institution_name}
          />
        </Field>
        <Field>
          <FieldLabel>{t("Jurusan / Gelar")}</FieldLabel>
          <Input
            onChange={(e) => setEditing({ ...editing, degree_major: e.target.value })}
            required
            value={editing.degree_major}
          />
        </Field>
        <Field>
          <FieldLabel>{t("IPK")}</FieldLabel>
          <Input
            inputMode="decimal"
            max="4"
            min="0"
            onChange={(e) => setEditing({ ...editing, gpa: e.target.value })}
            placeholder="3.84"
            step="0.01"
            type="number"
            value={editing.gpa}
          />
        </Field>
        <Field className="sm:col-span-2">
          <div className="flex w-full flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <FieldLabel className="shrink-0">{t("Periode")}</FieldLabel>
            <div className="flex flex-col gap-2 sm:items-end">
              <MonthYearRange
                hideEnd={editing.is_current}
                onChange={(value) => setEditing({ ...editing, range_date: value })}
                value={editing.range_date}
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={editing.is_current}
                  onCheckedChange={(checked) =>
                    setEditing({
                      ...editing,
                      is_current: checked,
                      range_date: checked
                        ? (editing.range_date.split(/\s*-\s*/)[0] ?? "").trim()
                        : editing.range_date,
                    })
                  }
                />
                {t("Saya sedang menjalani kuliah")}
              </label>
            </div>
          </div>
        </Field>
      </div>

      <Field>
        <FieldLabel>{t("Deskripsi")}</FieldLabel>
        <Textarea
          className={cn(
            "[&_textarea]:resize-none",
            fill
              ? "[&_textarea]:min-h-24"
              : "[&_textarea]:min-h-0 [&_textarea]:max-h-20",
          )}
          onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          value={editing.description}
        />
      </Field>
    </div>
  );
}

function SertifikasiEditor({
  editing,
  setEditing,
  isMobile,
  headerClassName,
  contentClassName,
}: {
  editing: EducationForm;
  setEditing: EducationSetter;
  isMobile: boolean;
  headerClassName?: string;
  contentClassName?: string;
}) {
  const { t } = useLanguage();
  function updateAchievement(index: number, patch: Partial<AchievementForm>) {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            achievements: prev.achievements.map((achievement, i) =>
              i === index ? { ...achievement, ...patch } : achievement,
            ),
          }
        : prev,
    );
  }

  function removeAchievement(index: number) {
    setEditing((prev) =>
      prev
        ? {
            ...prev,
            achievements: prev.achievements.filter((_, i) => i !== index),
          }
        : prev,
    );
  }

  return (
    <>
      <div className={headerClassName}>
        <p className="text-sm font-medium">{t("Sertifikasi & Pencapaian")}</p>
        <Button
          onClick={() =>
            setEditing((prev) =>
              prev
                ? { ...prev, achievements: [...prev.achievements, { ...EMPTY_ACHIEVEMENT }] }
                : prev,
            )
          }
          size="xs"
          type="button"
          variant="outline"
        >
          <PlusIcon /> {t("Tambah")}
        </Button>
      </div>

      <div className={contentClassName}>
        {editing.achievements.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <EmptyBoxIllustration className="size-16 opacity-60" />
            <p className="text-muted-foreground text-sm">{t("Belum ada sertifikat.")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {editing.achievements.map((achievement, index) => (
              <SwipeActions
                actions={
                  <SwipeActionButton
                    aria-label={t("Hapus")}
                    className="bg-destructive text-white"
                    onClick={() => removeAchievement(index)}
                  >
                    <TrashIcon className="size-4" />
                  </SwipeActionButton>
                }
                enabled={isMobile}
                key={index}
              >
                <div className="space-y-3 rounded-md border p-3">
                  <div className="grid gap-3 lg:grid-cols-2 lg:gap-2">
                    <Field>
                      <FieldLabel>{t("Organisasi")}</FieldLabel>
                      <OrgSelect
                        onChange={(value) => updateAchievement(index, { organization: value })}
                        value={achievement.organization}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t("Judul")}</FieldLabel>
                      <Input
                        onChange={(e) => updateAchievement(index, { title: e.target.value })}
                        value={achievement.title}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t("Periode")}</FieldLabel>
                      <MonthYearPicker
                        onChange={(value) => updateAchievement(index, { period: value })}
                        value={achievement.period}
                      />
                    </Field>
                    <Field>
                      <FieldLabel>{t("Dokumen")}</FieldLabel>
                      <DocumentsField
                        onChange={(documents) => updateAchievement(index, { documents })}
                        scope="certificate"
                        value={achievement.documents}
                      />
                    </Field>
                  </div>
                  {!isMobile && (
                    <div className="flex justify-end">
                      <Button
                        onClick={() => removeAchievement(index)}
                        size="xs"
                        type="button"
                        variant="destructive-outline"
                      >
                        <TrashIcon /> {t("Hapus")}
                      </Button>
                    </div>
                  )}
                </div>
              </SwipeActions>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function certificateIcon(
  organization: string | null | undefined,
  url: string | null | undefined,
): string | null {
  const byName = resolveCertLogo(organization);
  if (byName) return byName;
  const value = (url ?? "").trim();
  if (!value) return null;
  try {
    const host = new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(
      /^www\./,
      "",
    );
    return logoFromDomain(host);
  } catch {
    return null;
  }
}

function CertIcon({ src }: { src: string | null }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
      {src && !failed ? (
        <img
          alt=""
          className="size-6 object-contain"
          onError={() => setFailed(true)}
          src={src}
        />
      ) : (
        <TrophyIcon className="size-5 text-muted-foreground" />
      )}
    </span>
  );
}

function CertLogoPreview({
  name,
  small = false,
}: {
  name: string | null | undefined;
  small?: boolean;
}) {
  const logo = resolveCertLogo(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-md border bg-white",
        small ? "size-4" : "size-5",
      )}
    >
      {logo && !failed ? (
        <img
          alt=""
          className={cn("object-contain", small ? "size-3" : "size-4")}
          onError={() => setFailed(true)}
          src={logo}
        />
      ) : (
        <TrophyIcon className={cn("text-muted-foreground", small ? "size-2.5" : "size-3")} />
      )}
    </span>
  );
}

function OrgSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const items =
    value && !CERT_ORGANIZATIONS.includes(value)
      ? [value, ...CERT_ORGANIZATIONS]
      : CERT_ORGANIZATIONS;
  const logo = resolveCertLogo(value);
  const { t } = useLanguage();

  return (
    <Combobox
      items={items}
      onValueChange={(next) => onChange((next as string | null) ?? "")}
      value={value || null}
    >
      <ComboboxInput
        placeholder={t("Pilih organisasi")}
        showClear
        startAddon={
          logo ? (
            <span className="grid size-4 shrink-0 place-items-center rounded-sm bg-white">
              <img alt="" className="size-3 object-contain" src={logo} />
            </span>
          ) : (
            <TrophyIcon className="size-4 text-muted-foreground" />
          )
        }
      />
      <ComboboxPopup>
        <ComboboxEmpty>{t("Organisasi tidak ditemukan.")}</ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              <span className="flex items-center gap-2">
                <CertLogoPreview name={item} />
                {item}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxPopup>
    </Combobox>
  );
}

function DocumentsField({
  value,
  onChange,
  scope,
}: {
  value: string[];
  onChange: (documents: string[]) => void;
  scope?: string;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState<number | "new" | null>(null);
  const isDesktop = useMediaQuery("lg");
  const { t } = useLanguage();

  function update(index: number, doc: string) {
    const next = [...value];
    next[index] = doc;
    onChange(next);
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  const fileCount = value.filter(isDocumentFile).length;
  const linkCount = value.length - fileCount;
  const summary =
    value.length === 0
      ? t("Belum ada dokumen")
      : [
          linkCount ? t("{count} tautan", { count: linkCount }) : null,
          fileCount ? t("{count} file", { count: fileCount }) : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const trigger = (
    <button
      className="flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
      onClick={() => setOpen(true)}
      type="button"
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          value.length === 0 && "text-muted-foreground",
        )}
      >
        {summary}
      </span>
      <span className="shrink-0 text-muted-foreground">
        {fileCount > 0 ? <DocumentTextIcon className="size-4" /> : <LinkIcon className="size-4" />}
      </span>
    </button>
  );

  const links = value
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => !isDocumentFile(doc));
  const files = value
    .map((doc, index) => ({ doc, index }))
    .filter(({ doc }) => isDocumentFile(doc));

  const body = (
    <div className="overflow-hidden rounded-xl border bg-card">
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60 disabled:pointer-events-none disabled:opacity-60"
        // Hanya satu URL kredensial per sertifikat.
        disabled={links.length > 0}
        onClick={() => onChange([...value, ""])}
        type="button"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <LinkIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{t("Tautan")}</span>
          <span className="block text-xs leading-snug text-muted-foreground">
            {t("Tambahkan URL kredensial")}
          </span>
        </span>
        <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {links.length > 0 && (
        <div className="max-h-48 space-y-2 overflow-y-auto px-3 pb-3">
          {links.map(({ doc, index }) => (
            <div className="flex items-center gap-2" key={index}>
              <Input
                className="min-w-0 flex-1"
                onChange={(e) => update(index, e.target.value)}
                placeholder={t("URL kredensial…")}
                value={doc}
              />
              <Button
                aria-label={t("Hapus tautan")}
                onClick={() => remove(index)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="border-t" />
      <button
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent/60"
        onClick={() => setPicking("new")}
        type="button"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <ArrowUpTrayIcon className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{t("Unggah file")}</span>
          <span className="block text-xs leading-snug text-muted-foreground">
            {t("Pilih file sertifikat")}
          </span>
        </span>
        <PlusIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      {files.length > 0 && (
        <div className="max-h-48 space-y-2 overflow-y-auto px-3 pb-3">
          {files.map(({ doc, index }) => (
            <div
              className="flex items-center gap-2 rounded-lg border bg-muted/30 py-1 pr-1 pl-3"
              key={index}
            >
              <DocumentTextIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">
                {doc.split("/").pop() || doc}
              </span>
              <Button
                aria-label={t("Hapus file")}
                onClick={() => remove(index)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const picker = (
    <MediaPickerDialog
      current={typeof picking === "number" ? (value[picking] ?? "") : ""}
      kind="file"
      onClose={() => setPicking(null)}
      onSelect={(url) => {
        if (picking === "new") onChange([...value, url]);
        else if (typeof picking === "number") update(picking, url);
        setPicking(null);
      }}
      open={picking != null}
      scope={scope}
    />
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogPopup className="sm:max-w-md" showCloseButton>
            <DialogHeader>
              <DialogTitle className="text-base">{t("Dokumen")}</DialogTitle>
              <DialogDescription>
                {t("Tambahkan tautan kredensial atau unggah file sertifikat.")}
              </DialogDescription>
            </DialogHeader>
            <DialogPanel className="space-y-3">{body}</DialogPanel>
            <DialogFooter>
              <Button
                className="w-full sm:w-auto"
                onClick={() => setOpen(false)}
                type="button"
              >
                {t("Selesai")}
              </Button>
            </DialogFooter>
          </DialogPopup>
        </Dialog>
        {picker}
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer onOpenChange={setOpen} open={open} position="bottom">
        <DrawerPopup showCloseButton>
          <DrawerHeader>
            <DrawerTitle className="text-base">{t("Dokumen")}</DrawerTitle>
          </DrawerHeader>
          <DrawerPanel className="space-y-3" data-base-ui-swipe-ignore>
            {body}
          </DrawerPanel>
          <DrawerFooter>
            <Button
              className="w-full sm:w-auto"
              onClick={() => setOpen(false)}
              type="button"
            >
              {t("Selesai")}
            </Button>
          </DrawerFooter>
        </DrawerPopup>
      </Drawer>
      {picker}
    </>
  );
}
