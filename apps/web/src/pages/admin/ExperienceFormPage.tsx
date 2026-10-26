import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import type { Experience } from "@portofolio/shared";
import { apiGet, apiSend } from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import MediaPreviewDialog from "@/components/admin/MediaPreviewDialog";
import {
  useRequestLeave,
  useUnsavedChangesGuard,
} from "@/components/admin/unsaved-changes";
import {
  EMPTY,
  ExperienceFields,
  toForm,
  type ExperienceForm,
} from "@/components/admin/experience-fields";

const LIST_PATH = "/admin/content/experience";

export default function ExperienceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isEdit = id != null;
  const requestLeave = useRequestLeave();

  const [editing, setEditing] = useState<ExperienceForm | null>(() =>
    isEdit ? null : { ...EMPTY },
  );
  const [baseline, setBaseline] = useState<ExperienceForm | null>(() =>
    isEdit ? null : { ...EMPTY },
  );
  const [preview, setPreview] = useState<{ photos: string[]; index: number } | null>(null);

  const editingRef = useRef<ExperienceForm | null>(editing);
  editingRef.current = editing;

  // Navigasi lewat efek agar guard sempat di-unregister; jika tidak, useBlocker memblokirnya.
  const createdIdRef = useRef<number | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "experience", id],
    queryFn: () => apiGet<Experience>(`/admin/experiences/${id}`),
    enabled: isEdit,
  });

  useEffect(() => {
    if (!data) return;
    const form = toForm(data);
    setEditing(form);
    setBaseline(form);
  }, [data]);

  const isDirty =
    editing !== null &&
    baseline !== null &&
    JSON.stringify(editing) !== JSON.stringify(baseline);

  const saveMutation = useMutation({
    mutationFn: (form: ExperienceForm) => {
      const payload = {
        ...form,
        skills: form.skills.map((item) => item.trim()).filter(Boolean),
        photos: form.photos.filter(Boolean),
      };
      return isEdit && id
        ? apiSend<Experience>("PUT", `/admin/experiences/${id}`, payload)
        : apiSend<Experience>("POST", "/admin/experiences", payload);
    },
    onSuccess: (saved) => {
      if (!isEdit) createdIdRef.current = saved.id;
      queryClient.invalidateQueries({ queryKey: ["admin", "experiences"] });
      queryClient.invalidateQueries({ queryKey: ["experiences"] });
      toastManager.add({
        title: t("Tersimpan"),
        description: t("Data pengalaman berhasil disimpan."),
        type: "success",
      });
      if (editingRef.current) {
        setBaseline(editingRef.current);
        setEditing(editingRef.current);
      }
    },
    onError: (error) => {
      toastManager.add({
        title: t("Gagal menyimpan"),
        description: (error as Error).message,
        type: "error",
      });
    },
  });

  useUnsavedChangesGuard({
    isDirty,
    onSave: () => (editing ? saveMutation.mutateAsync(editing) : Promise.resolve()),
  });

  useEffect(() => {
    if (isDirty || createdIdRef.current === null) return;
    const createdId = createdIdRef.current;
    createdIdRef.current = null;
    navigate(`${LIST_PATH}/${createdId}/edit`, { replace: true });
  }, [isDirty, navigate]);

  function goBack() {
    requestLeave(() => navigate(LIST_PATH));
  }

  if (isEdit && isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (isEdit && error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-xl">{t("Ubah Pengalaman")}</h1>
          <p className="text-muted-foreground text-sm">{t("Kelola pengalaman kerja dan organisasi.")}</p>
        </div>
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Gagal memuat data pengalaman")}</AlertTitle>
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isEdit && !data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-semibold text-xl">{t("Ubah Pengalaman")}</h1>
          <p className="text-muted-foreground text-sm">{t("Kelola pengalaman kerja dan organisasi.")}</p>
        </div>
        <Alert variant="error">
          <ExclamationCircleIcon />
          <AlertTitle>{t("Data tidak ditemukan")}</AlertTitle>
          <AlertDescription>{t("Pengalaman yang ingin diedit tidak ditemukan.")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col gap-6 lg:min-h-[calc(100svh-5.5rem)]">
      <div>
        <h1 className="font-semibold text-xl">
          {isEdit ? t("Ubah Pengalaman") : t("Tambah Pengalaman")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("Kelola pengalaman kerja dan organisasi.")}</p>
      </div>

      {editing && (
        <>
          <form
            id="experience-form"
            className="pb-24"
            onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(editing);
            }}
          >
            <div className="space-y-4">
              <ExperienceFields
                editing={editing}
                onPreview={(photos, index) => setPreview({ photos, index })}
                setEditing={setEditing}
              />

              {saveMutation.error && (
                <p className="text-destructive-foreground text-sm">
                  {(saveMutation.error as Error).message}
                </p>
              )}
            </div>
          </form>

          <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-end gap-2 border bg-card/95 px-4 py-3 shadow-sm backdrop-blur lg:px-6 md:left-[var(--sidebar-offset)]">
            <Button onClick={goBack} type="button" variant="ghost">
              {t("Batal")}
            </Button>
            <Button form="experience-form" loading={saveMutation.isPending} type="submit">
              {t("Simpan")}
            </Button>
          </div>
        </>
      )}

      <MediaPreviewDialog
        onClose={() => setPreview(null)}
        open={preview !== null}
        photos={preview?.photos}
        index={preview?.index ?? 0}
        onIndexChange={(index) => setPreview({ photos: preview?.photos ?? [], index })}
        title={t("Pratinjau Foto")}
        url={preview ? (preview.photos[preview.index] ?? null) : null}
      />
    </div>
  );
}