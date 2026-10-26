import type { ReactNode } from "react";
import { formatUploadSize, maxUploadSize } from "@portofolio/shared";
import FileUploadSplit from "@/components/admin/FileUploadSplit";
import ImageCropUpload from "@/components/admin/ImageCropUpload";
import { Field, FieldLabel } from "@/components/ui/field";
import { useLanguage } from "@/lib/language";

interface HeroProfileUploadsProps {
  logoUrl: string;
  photoUrl: string;
  cvUrl: string;
  onLogoChange: (url: string) => void;
  onPhotoChange: (url: string) => void;
  onCvChange: (url: string) => void;
}

export default function HeroProfileUploads({
  logoUrl,
  photoUrl,
  cvUrl,
  onLogoChange,
  onPhotoChange,
  onCvChange,
}: HeroProfileUploadsProps) {
  const { t } = useLanguage();
  const imageHint = t("PNG, JPG, WEBP, atau GIF — maks {size}", {
    size: formatUploadSize(maxUploadSize("image/png")),
  });
  const pdfHint = t("PDF — maks {size}", { size: formatUploadSize(maxUploadSize("application/pdf")) });

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <UploadField label="Logo">
        <ImageCropUpload
          aspect={1}
          compact
          hint={imageHint}
          label="Logo"
          onChange={onLogoChange}
          preserveSize
          scope="hero-logo"
          value={logoUrl}
        />
      </UploadField>

      <UploadField label="Foto Konten">
        <ImageCropUpload
          aspect={4 / 5}
          compact
          hint={imageHint}
          label="Foto Konten"
          onChange={onPhotoChange}
          preserveSize
          scope="hero-photo"
          value={photoUrl}
        />
      </UploadField>

      <UploadField label="File CV">
        <FileUploadSplit
          compact
          hint={pdfHint}
          kind="file"
          label="File CV"
          onChange={onCvChange}
          scope="cv"
          value={cvUrl}
        />
      </UploadField>
    </div>
  );
}

function UploadField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const { t } = useLanguage();
  return (
    <Field className="min-w-0">
      <FieldLabel>{t(label)}</FieldLabel>
      <div className="min-w-0 w-full rounded-lg border bg-card p-3 shadow-sm">
        {children}
      </div>
    </Field>
  );
}
