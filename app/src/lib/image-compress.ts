/**
 * Client-side JPEG compression used to derive MLS-ready versions of
 * photographer uploads. Everything happens in a hidden canvas so we
 * avoid a Cloud Functions dependency.
 *
 *   - Max long edge:  2048 px  (MLS sweet spot — big enough for retina
 *                                detail, small enough to stay under the
 *                                typical 2–5 MB upload caps)
 *   - Quality:        0.85     (visually near-lossless at these sizes)
 *   - Output format:  image/jpeg
 */

export interface CompressOptions {
  maxEdge?: number;
  quality?: number;
  mimeType?: string;
}

export interface CompressedResult {
  blob: Blob;
  width: number;
  height: number;
}

async function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function fitWithin(
  srcW: number,
  srcH: number,
  maxEdge: number
): { width: number; height: number } {
  if (srcW <= maxEdge && srcH <= maxEdge) {
    return { width: srcW, height: srcH };
  }
  const ratio = srcW > srcH ? maxEdge / srcW : maxEdge / srcH;
  return {
    width: Math.round(srcW * ratio),
    height: Math.round(srcH * ratio),
  };
}

/**
 * Return a JPEG blob scaled to fit within `maxEdge` × `maxEdge`. When
 * the source is already small enough, the blob is still re-encoded so
 * clients always get a predictably-sized output file.
 */
export async function compressImage(
  file: File | Blob,
  options: CompressOptions = {}
): Promise<CompressedResult> {
  const maxEdge = options.maxEdge ?? 2048;
  const quality = options.quality ?? 0.85;
  const mimeType = options.mimeType ?? "image/jpeg";

  const img = await loadImage(file);
  const { width, height } = fitWithin(
    img.naturalWidth,
    img.naturalHeight,
    maxEdge
  );

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );
  if (!blob) throw new Error("Canvas encode failed");

  return { blob, width, height };
}

/**
 * Read the natural dimensions of an image file without compressing —
 * used to record intrinsic size on the metadata entry when the user
 * uploads a compressed-only variant that we don't re-encode.
 */
export async function readImageSize(
  file: File | Blob
): Promise<{ width: number; height: number }> {
  const img = await loadImage(file);
  return { width: img.naturalWidth, height: img.naturalHeight };
}
