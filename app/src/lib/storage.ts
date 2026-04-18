import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytesResumable,
} from "firebase/storage";
import { storage } from "@/lib/firebase";

export interface UploadProgress {
  /** Bytes uploaded so far. */
  loaded: number;
  /** Total bytes the request will transfer once complete. */
  total: number;
  /** 0–1 fraction of total progress (clamped). */
  ratio: number;
}

export interface UploadedObject {
  path: string;
  url: string;
  size: number;
}

/**
 * Upload a Blob to `users/<uid>/<subPath>` with progress callbacks and
 * return the resulting path + long-lived download URL. The download URL
 * carries a token so clients without auth can fetch it (which is
 * exactly what the public share page needs).
 *
 * Throws on network / auth errors — callers should show a toast and
 * leave the event's metadata unchanged.
 */
export async function uploadToUserPath(
  uid: string,
  subPath: string,
  blob: Blob,
  options: {
    contentType?: string;
    onProgress?: (p: UploadProgress) => void;
  } = {}
): Promise<UploadedObject> {
  const fullPath = `users/${uid}/${subPath}`;
  const ref = storageRef(storage, fullPath);

  const task = uploadBytesResumable(ref, blob, {
    contentType: options.contentType ?? blob.type ?? "application/octet-stream",
    cacheControl: "public, max-age=31536000",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap) => {
        const total = snap.totalBytes || blob.size || 1;
        const ratio = Math.max(0, Math.min(1, snap.bytesTransferred / total));
        options.onProgress?.({
          loaded: snap.bytesTransferred,
          total,
          ratio,
        });
      },
      reject,
      () => resolve()
    );
  });

  const url = await getDownloadURL(ref);
  return { path: fullPath, url, size: blob.size };
}

/**
 * Delete a previously-uploaded object. Safe to call on paths that no
 * longer exist — the "object-not-found" error is swallowed so callers
 * can always clean up without guarding. Other errors bubble up.
 */
export async function deleteFromPath(path: string): Promise<void> {
  try {
    await deleteObject(storageRef(storage, path));
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "storage/object-not-found") return;
    throw err;
  }
}

/** Cheap file-type guess from MIME type. */
export function fileKindFor(mime: string): "photo" | "video" | "other" {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  return "other";
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const n = bytes / Math.pow(1024, i);
  return `${n < 10 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}
