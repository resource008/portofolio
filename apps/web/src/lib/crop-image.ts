export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CroppedImage {
  blob: Blob;
  mime: string;
  extension: string;
}

const MIME_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Maximum output dimension (longest edge) so cropped images stay small. */
const MAX_DIMENSION = 2048;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // The blob store is a different origin than the app. Without this the
    // browser loads the image without CORS headers, which taints the canvas
    // and makes `toBlob` throw a SecurityError.
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Gagal memuat gambar untuk dipotong.")),
    );
    image.src = src;
  });
}

/** Whether any pixel is not fully opaque, i.e. the image needs an alpha channel. */
function hasTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): boolean {
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

/**
 * Crop an image (given natural-pixel area) into a Blob. The result is
 * downscaled to `maxDimension` (longest edge) and re-encoded as WebP so the
 * uploaded file is as small as possible — fewer bytes = faster loading.
 * Falls back to PNG only when transparency is required and WebP is
 * unavailable, and JPEG otherwise.
 */
export async function cropImageToBlob(
  imageSrc: string,
  area: CropArea,
  mime?: string,
  maxDimension: number = MAX_DIMENSION,
): Promise<CroppedImage> {
  const image = await loadImage(imageSrc);
  let width = Math.round(area.width);
  let height = Math.round(area.height);

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, width, height);

  const supportsWebp = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  const outputMime =
    mime ??
    (supportsWebp
      ? "image/webp"
      : hasTransparency(ctx, width, height)
        ? "image/png"
        : "image/jpeg");
  const quality = outputMime === "image/png" ? undefined : 0.85;

  const blob = await new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Gagal memotong gambar."))),
        outputMime,
        quality,
      );
    } catch {
      reject(new Error("Gagal memotong gambar. Muat ulang halaman lalu coba lagi."));
    }
  });

  return {
    blob,
    mime: outputMime,
    extension: MIME_EXTENSION[outputMime] ?? "png",
  };
}
