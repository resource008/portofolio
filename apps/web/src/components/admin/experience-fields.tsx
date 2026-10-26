import { useEffect, useRef, useState } from "react";
import { BriefcaseIcon, CodeBracketIcon, ListBulletIcon, NumberedListIcon, PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Experience } from "@portofolio/shared";
import { domainFromLogo, logoFromDomain } from "@/lib/campus-logo";
import { resolveTechLogo, TECH_OPTIONS } from "@/lib/tech-logo";
import { useLanguage } from "@/lib/language";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxValue,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import MediaPickerDialog from "@/components/admin/MediaPickerDialog";
import { HScroll } from "@/components/admin/HScroll";
import { MonthYearRange } from "@/components/admin/history-fields";

export interface ExperienceForm {
  id?: number;
  company_name: string;
  position: string;
  range_date: string;
  logo_url: string;
  description: string;
  skills: string[];
  photos: string[];
  is_current: boolean;
}

export const EMPTY: ExperienceForm = {
  company_name: "",
  position: "",
  range_date: "",
  logo_url: "",
  description: "",
  skills: [],
  photos: [],
  is_current: false,
};

export function toForm(item: Experience): ExperienceForm {
  return {
    id: item.id,
    company_name: item.company_name,
    position: item.position,
    range_date: item.range_date,
    logo_url: item.logo_url ?? "",
    description: item.description ?? "",
    skills: item.skills ?? [],
    photos: item.photos ?? [],
    is_current: item.is_current,
  };
}

export function TechLogoPreview({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  const logo = resolveTechLogo(name);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [logo]);

  if (size === "sm") {
    // Jangan render kotak kosong untuk skill tanpa logo — hanya tampilkan
    // kotak jika logonya benar-benar ada, supaya tidak menghalangi teks.
    if (!logo || failed) return null;

    return (
      <span className="grid size-4 shrink-0 place-items-center rounded-sm bg-white">
        <img
          alt=""
          className="size-3 object-contain"
          onError={() => setFailed(true)}
          src={logo}
        />
      </span>
    );
  }

  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-md border bg-white">
      {logo && !failed ? (
        <img
          alt=""
          className="size-4 object-contain"
          onError={() => setFailed(true)}
          src={logo}
        />
      ) : (
        <CodeBracketIcon className="size-3 text-muted-foreground" />
      )}
    </span>
  );
}

function PhotoField({
  value,
  onChange,
  scope,
  onPreview,
}: {
  value: string[];
  onChange: (photos: string[]) => void;
  scope?: string;
  onPreview?: (photos: string[], index: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <Field>
      {/* Frame foto: menampilkan foto terpilih di dalamnya */}
      <div className="flex h-48 w-full flex-col gap-3 rounded-lg border border-input bg-muted/20 p-3">
        <span className="font-medium text-foreground text-sm">{t("Foto")}</span>

        {value.length > 0 && (
          <HScroll className="gap-2">
            {value.map((photo, index) => (
              <div
                className="group relative shrink-0 overflow-hidden rounded-md border"
                key={photo}
              >
                <button
                  aria-label={t("Pratinjau foto {n}", { n: index + 1 })}
                  className="block cursor-zoom-in"
                  onClick={() => onPreview?.(value, index)}
                  type="button"
                >
                  <img alt="" className="h-20 w-auto object-cover" src={photo} />
                </button>
                <button
                  aria-label={t("Hapus foto")}
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/60 text-white sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                  onClick={() => onChange(value.filter((_, i) => i !== index))}
                  type="button"
                >
                  <XMarkIcon className="size-3" />
                </button>
              </div>
            ))}
          </HScroll>
        )}

        <div
          className={`flex items-center justify-center ${value.length === 0 ? "flex-1" : ""}`}
        >
          <Button onClick={() => setOpen(true)} size="sm" type="button" variant="outline">
            <PlusIcon />
            {t("Pilih Foto")}
          </Button>
        </div>
      </div>

      <MediaPickerDialog
        current={value}
        kind="image"
        multiple
        onClose={() => setOpen(false)}
        onSelectMany={(urls) => {
          const next = [...value];
          for (const url of urls) {
            if (!next.includes(url)) next.push(url);
          }
          onChange(next);
          setOpen(false);
        }}
        open={open}
        scope={scope}
      />
    </Field>
  );
}

/** Field form pengalaman — dipakai di halaman tambah/edit experience. */
export function ExperienceFields({
  editing,
  setEditing,
  onPreview,
}: {
  editing: ExperienceForm;
  setEditing: (form: ExperienceForm) => void;
  onPreview?: (photos: string[], index: number) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("Logo Perusahaan")}</FieldLabel>
          <div className="flex w-full items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-white">
              {editing.logo_url ? (
                <img
                  alt=""
                  className="size-3 object-contain"
                  src={editing.logo_url}
                />
              ) : (
                <BriefcaseIcon className="size-3 text-muted-foreground" />
              )}
            </span>
            <Input
              defaultValue={domainFromLogo(editing.logo_url) ?? ""}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  logo_url: logoFromDomain(e.target.value) ?? "",
                })
              }
              placeholder={t("domain perusahaan, mis. tokopedia.com")}
            />
          </div>
        </Field>
        <Field>
          <FieldLabel>{t("Nama Perusahaan")}</FieldLabel>
          <Input
            onChange={(e) => setEditing({ ...editing, company_name: e.target.value })}
            required
            value={editing.company_name}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>{t("Posisi")}</FieldLabel>
          <Input
            onChange={(e) => setEditing({ ...editing, position: e.target.value })}
            required
            value={editing.position}
          />
        </Field>
        <Field>
          <FieldLabel>Tech Stack</FieldLabel>
          <div className="w-full">
            <Combobox
              items={TECH_OPTIONS}
              multiple
              onValueChange={(next) =>
                setEditing({ ...editing, skills: next as string[] })
              }
              value={editing.skills}
            >
              <ComboboxChips>
                <ComboboxValue>
                  {(value: string[]) => (
                    <>
                      {value.map((skill) => (
                        <ComboboxChip key={skill}>
                          <TechLogoPreview name={skill} size="sm" />
                          {skill}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput placeholder={t("Ketik lalu pilih tech stack, mis. Docker…")} />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
              <ComboboxPopup>
                <ComboboxEmpty>{t("Tidak ditemukan.")}</ComboboxEmpty>
                <ComboboxList>
                  {(item: string) => (
                    <ComboboxItem key={item} value={item}>
                      <span className="flex items-center gap-2">
                        <TechLogoPreview name={item} />
                        {item}
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
          </div>
        </Field>
      </div>

      <div className="space-y-4">
        <Field>
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
                {t("Saya masih bekerja di sini")}
              </label>
            </div>
          </div>
        </Field>
        <PhotoField
          onChange={(photos) => setEditing({ ...editing, photos })}
          onPreview={onPreview}
          scope="experience-photo"
          value={editing.photos}
        />
      </div>

      <DescriptionEditor
        label={t("Deskripsi")}
        onChange={(value) => setEditing({ ...editing, description: value })}
        value={editing.description}
      />
    </div>
  );
}

interface ListResult {
  next: string;
  blockStart: number;
  blockEnd: number;
}

function toggleListLines(value: string, start: number, end: number, ordered: boolean): ListResult {
  const blockStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEndRaw = value.indexOf("\n", end);
  const blockEnd = lineEndRaw === -1 ? value.length : lineEndRaw;
  const lines = value.slice(blockStart, blockEnd).split("\n");
  const marker = ordered ? /^(\s*)\d+\. / : /^(\s*)- /;
  const allPrefixed = lines.every((line) => marker.test(line));

  let counter = 0;
  const nextLines = lines.map((line) => {
    const indent = line.match(/^\s*/)?.[0] ?? "";
    const body = line.slice(indent.length).replace(/^(- |\d+\. )/, "");
    if (allPrefixed) return indent + body;
    counter += 1;
    return `${indent}${ordered ? `${counter}. ` : "- "}${body}`;
  });

  const nextBlock = nextLines.join("\n");
  const next = value.slice(0, blockStart) + nextBlock + value.slice(blockEnd);
  return { next, blockStart, blockEnd: blockStart + nextBlock.length };
}

function DescriptionEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ start: number; end: number } | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (pending.current && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(pending.current.start, pending.current.end);
      pending.current = null;
    }
  }, [value]);

  function handleList(ordered: boolean) {
    const element = ref.current;
    if (!element) return;
    const result = toggleListLines(
      value,
      element.selectionStart ?? 0,
      element.selectionEnd ?? 0,
      ordered,
    );
    pending.current = { start: result.blockStart, end: result.blockEnd };
    onChange(result.next);
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between">
        <span className="inline-flex items-center font-medium text-foreground text-sm/4">
          {label}
        </span>
        <div className="flex items-center divide-x overflow-hidden rounded-md border">
          <Button
            aria-label={t("Daftar poin")}
            className="rounded-none"
            onClick={() => handleList(false)}
            size="icon-sm"
            title={t("Daftar poin")}
            type="button"
            variant="ghost"
          >
            <ListBulletIcon />
          </Button>
          <Button
            aria-label={t("Daftar bernomor")}
            className="rounded-none"
            onClick={() => handleList(true)}
            size="icon-sm"
            title={t("Daftar bernomor")}
            type="button"
            variant="ghost"
          >
            <NumberedListIcon />
          </Button>
        </div>
      </div>
      <Textarea
        className="[&_textarea]:resize-none sm:[&_textarea]:min-h-24"
        onChange={(e) => onChange(e.target.value)}
        ref={ref}
        value={value}
      />
    </div>
  );
}
