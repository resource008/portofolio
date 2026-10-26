import { useState } from "react";
import { ArrowUpTrayIcon, DocumentTextIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { fileNameFromUrl, truncateFileName } from "@/lib/utils";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import { useLanguage } from "@/lib/language";

interface FileUploadSplitProps {
  value: string;
  onChange: (url: string) => void;
  kind?: "image" | "file";
  hint?: string;
  scope?: string;
  label?: string;
  /** Tampilan ringkas: thumbnail + nama file + tombol aksi ringkas. */
  compact?: boolean;
}

/** ArrowUpTrayIcon file: baris info file + tombol "Pilih File" yang membuka dialog media. */
export default function FileUploadSplit({
  value,
  onChange,
  kind = "file",
  hint,
  scope,
  label = "File",
  compact = false,
}: FileUploadSplitProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const name = value ? fileNameFromUrl(value) : "";

  return (
    <>
      {compact ? (
        <div className="flex w-full min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
            {value && kind === "image" ? (
              <img alt="" className="h-full w-full object-cover" src={value} />
            ) : (
              <DocumentTextIcon className="size-5 text-muted-foreground" />
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm font-medium" title={name}>
            {value ? truncateFileName(name) : t(label)}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {value && (
              <Button
                aria-label={t("Hapus file")}
                onClick={() => onChange("")}
                size="icon"
                type="button"
                variant="ghost"
              >
                <TrashIcon />
              </Button>
            )}
            <Button
              aria-label={kind === "image" ? t("Pilih foto") : t("Pilih file")}
              className="gap-1.5"
              onClick={() => setOpen(true)}
              size="sm"
              title={hint}
              type="button"
              variant="outline"
            >
              <ArrowUpTrayIcon />
              {kind === "image" ? t("Pilih Foto") : t("Pilih File")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 text-left">
            <p className="text-muted-foreground text-xs">{t("File terunggah")}</p>
            {value ? (
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <DocumentTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium text-sm" title={name}>
                  {truncateFileName(name)}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground text-sm">{t("Belum ada file diunggah.")}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
            {value && (
              <Button onClick={() => onChange("")} size="sm" type="button" variant="ghost">
                <TrashIcon /> {t("Hapus file")}
              </Button>
            )}
            <Button
              onClick={() => setOpen(true)}
              size="sm"
              title={hint}
              type="button"
              variant="outline"
            >
              <ArrowUpTrayIcon /> {t("Pilih File")}
            </Button>
          </div>
        </div>
      )}

      <MediaPickerDialog
        current={value}
        kind={kind}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onChange(url);
          setOpen(false);
        }}
        open={open}
        scope={scope}
      />
    </>
  );
}
