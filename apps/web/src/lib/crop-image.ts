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

const MAX_DIMENSION = 2048;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    // Blob store is cross-origin; without this the canvas is tainted and `toBlob` throws.
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () =>
      reject(new Error("Gagal memuat gambar untuk dipotong.")),
    );
    image.src = src;
  });
}

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
