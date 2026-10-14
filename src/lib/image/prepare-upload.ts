/**
 * Client-side photo prep for mobile uploads.
 * Resizes/compresses camera photos so Netlify/OpenAI accept them, and
 * normalizes to a JPEG File with a safe filename (avoids HEIC / empty names).
 */

const MAX_EDGE = 1536;
const JPEG_QUALITY = 0.92;

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

export async function preparePhotoForUpload(file: File): Promise<File> {
  // Prefer createImageBitmap (handles orientation better on modern browsers).
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    bitmap = null;
  }

  const drawn = await new Promise<{
    canvas: HTMLCanvasElement;
    mime: string;
  }>((resolve, reject) => {
    const finish = (width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
      const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
      const w = Math.max(1, Math.round(width * scale));
      const h = Math.max(1, Math.round(height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not prepare photo for upload."));
        return;
      }
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);
      draw(ctx);
      resolve({ canvas, mime: "image/jpeg" });
    };

    if (bitmap) {
      finish(bitmap.width, bitmap.height, (ctx) => {
        ctx.drawImage(bitmap!, 0, 0, ctx.canvas.width, ctx.canvas.height);
      });
      return;
    }

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      finish(img.naturalWidth || img.width, img.naturalHeight || img.height, (ctx) => {
        ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
        URL.revokeObjectURL(url);
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Could not read that photo. Try Upload photo and choose a JPG or PNG.",
        ),
      );
    };
    img.src = url;
  });

  if (bitmap) bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) => {
    drawn.canvas.toBlob(
      (result) => {
        if (!result) {
          reject(new Error("Could not compress photo for upload."));
          return;
        }
        resolve(result);
      },
      drawn.mime,
      JPEG_QUALITY,
    );
  });

  const ext = extensionForMime(drawn.mime);
  return new File([blob], `photo.${ext}`, {
    type: drawn.mime,
    lastModified: Date.now(),
  });
}

export async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function friendlyGenerateError(
  status: number,
  payload: { error?: string; details?: string } | null,
  fallback: unknown,
): string {
  const details = payload?.details || payload?.error || "";
  const combined = `${details} ${String(fallback ?? "")}`.toLowerCase();

  if (
    combined.includes("credit") ||
    combined.includes("quota") ||
    combined.includes("billing")
  ) {
    return "OpenAI has no credits remaining. Add billing credits, then try again.";
  }
  if (
    status === 504 ||
    status === 502 ||
    combined.includes("timeout") ||
    combined.includes("timed out") ||
    combined.includes("unknown error has occurred")
  ) {
    return "Generation took too long on the server. Please try again — a clearer selfie often works faster.";
  }
  if (status === 413 || combined.includes("too large") || combined.includes("entity too large")) {
    return "That photo is too large. Try taking another selfie or uploading a smaller image.";
  }
  if (combined.includes("expected pattern") || combined.includes("syntaxerror")) {
    return "Could not process that photo on this device. Try Upload photo with a JPG/PNG, or take another selfie.";
  }
  if (
    combined.includes("safety") ||
    combined.includes("rejected") ||
    combined.includes("moderation") ||
    combined.includes("policy")
  ) {
    return "That photo was blocked by the image safety filter. Try a clear, well-lit face photo of one person (no sunglasses covering the eyes), then generate again.";
  }
  if (payload?.details) return payload.details;
  if (payload?.error) return payload.error;
  if (fallback instanceof Error && fallback.message !== "Generation failed. Please try again.") {
    return fallback.message;
  }
  return "Generation failed. Please try again.";
}
