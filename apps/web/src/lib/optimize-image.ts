import { validateUpload } from "@portofolio/shared";

const MAX_DIMENSION = 2560;

const UNTOUCHABLE = new Set(["image/gif"]);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Gagal memuat gambar untuk dioptimasi.")),
    );
    image.src = src;
  });
}

export async function optimizeImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || UNTOUCHABLE.has(file.type)) return file;

  try {
    const url = URL.createObjectURL(file);
    const image = await loadImage(url);
    const longestEdge = Math.max(image.naturalWidth, image.naturalHeight);

    if (longestEdge <= MAX_DIMENSION && file.type === "image/webp") {
      URL.revokeObjectURL(url);
      return file;
    }

    const scale = Math.min(1, MAX_DIMENSION / longestEdge);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return file;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
    if (!supportsWebp) {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) => (result ? resolve(result) : reject(new Error("Gagal mengoptimasi gambar."))),
          "image/jpeg",
          0.85,
        ),
      );
      return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
    }

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Gagal mengoptimasi gambar."))),
        "image/webp",
        0.85,
      ),
    );

    if (blob.size > file.size) {
      const fallback = file;
      const validation = validateUpload(fallback);
      if (validation.ok) return fallback;
    }

    return new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" });
  } catch {
    return file;
  }
}