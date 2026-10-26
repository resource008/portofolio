import { validateUpload } from "@portofolio/shared";

/** Maximum output dimension (longest edge) for uploaded images. */
const MAX_DIMENSION = 2560;

/** Images we never re-encode, e.g. animated GIFs. */
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

/**
 * Downscale a raster image to `MAX_DIMENSION` (longest edge) and re-encode it
 * as WebP so uploaded photos stay small and load fast. GIFs (animated), PDFs
 * and videos are returned unchanged. If the original is already smaller than
 * the optimized result, the original is kept.
 */
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

    // Keep the original when re-encoding produced a bigger file (rare for
    // small PNGs/JPEGs) — only if it still passes the size limit.
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