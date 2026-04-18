import { useRef, useState } from "react";
import {
  Download,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { compressImage } from "@/lib/image-compress";
import {
  deleteFromPath,
  fileKindFor,
  formatBytes,
  uploadToUserPath,
  type UploadProgress,
} from "@/lib/storage";
import type { EventFile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface EventFilesProps {
  uid: string;
  eventId: string;
  files: EventFile[];
  onChange: (next: EventFile[]) => void;
}

interface PendingUpload {
  id: string;
  name: string;
  kind: "photo" | "video" | "other";
  /** Stage drives the status label. Transitions idle -> compressing ->
   *  uploading -> done | error. */
  stage: "compressing" | "uploading" | "error";
  ratio: number;
  message?: string;
}

function fileExt(name: string, mime: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : "";
  if (fromName) return fromName.toLowerCase();
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
}

export function EventFiles({
  uid,
  eventId,
  files,
  onChange,
}: EventFilesProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EventFile | null>(null);

  const updatePending = (id: string, patch: Partial<PendingUpload>) => {
    setPending((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  };

  const removePending = (id: string) => {
    setPending((prev) => prev.filter((p) => p.id !== id));
  };

  /**
   * Handle one raw File: compress if it's a photo, then upload both the
   * original and (for photos) the compressed derivative in sequence so
   * the per-file progress bar tells a coherent story. On success, push
   * a metadata entry onto the event; on failure, leave a red row in
   * the pending list the user can dismiss.
   */
  const handleOne = async (file: File) => {
    const localId = `up_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const kind = fileKindFor(file.type);
    setPending((prev) => [
      ...prev,
      {
        id: localId,
        name: file.name,
        kind,
        stage: kind === "photo" ? "compressing" : "uploading",
        ratio: 0,
      },
    ]);

    try {
      const fileId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ext = fileExt(file.name, file.type);
      const base = `events/${eventId}/${fileId}`;
      const safeName = sanitizeName(file.name);

      let compressedVariant: EventFile["compressed"];

      if (kind === "photo") {
        // Compress first so we know the output size for the progress
        // math. Upload original and compressed sequentially rather than
        // in parallel — keeps the progress bar monotonic.
        const compressed = await compressImage(file);
        updatePending(localId, { stage: "uploading", ratio: 0 });

        const origUp = await uploadToUserPath(
          uid,
          `${base}/original.${ext}`,
          file,
          {
            contentType: file.type,
            onProgress: (p: UploadProgress) => {
              // Reserve the first 50% of the bar for the original;
              // compressed takes the second half so the user sees
              // continuous movement.
              updatePending(localId, { ratio: p.ratio * 0.5 });
            },
          }
        );

        const compUp = await uploadToUserPath(
          uid,
          `${base}/compressed.jpg`,
          compressed.blob,
          {
            contentType: "image/jpeg",
            onProgress: (p: UploadProgress) => {
              updatePending(localId, { ratio: 0.5 + p.ratio * 0.5 });
            },
          }
        );

        compressedVariant = {
          path: compUp.path,
          url: compUp.url,
          size: compUp.size,
          width: compressed.width,
          height: compressed.height,
        };

        const meta: EventFile = {
          id: fileId,
          name: safeName,
          kind: "photo",
          mimeType: file.type,
          uploadedAt: Date.now(),
          original: { path: origUp.path, url: origUp.url, size: origUp.size },
          compressed: compressedVariant,
        };
        onChange([...files, meta]);
      } else {
        // Videos and other files — upload as-is, single variant.
        const origUp = await uploadToUserPath(
          uid,
          `${base}/original.${ext}`,
          file,
          {
            contentType: file.type,
            onProgress: (p) => updatePending(localId, { ratio: p.ratio }),
          }
        );
        const meta: EventFile = {
          id: fileId,
          name: safeName,
          kind,
          mimeType: file.type,
          uploadedAt: Date.now(),
          original: { path: origUp.path, url: origUp.url, size: origUp.size },
        };
        onChange([...files, meta]);
      }

      removePending(localId);
    } catch (err) {
      updatePending(localId, {
        stage: "error",
        message: err instanceof Error ? err.message : "Upload failed",
      });
    }
  };

  const handleFiles = (list: FileList | null) => {
    if (!list || !list.length) return;
    for (const f of Array.from(list)) {
      void handleOne(f);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    // Remove metadata first so UI reflects intent even if Storage lags.
    onChange(files.filter((f) => f.id !== deleteTarget.id));
    try {
      await deleteFromPath(deleteTarget.original.path);
      if (deleteTarget.compressed) {
        await deleteFromPath(deleteTarget.compressed.path);
      }
    } catch (err) {
      console.error("Failed to delete storage object", err);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors",
          isDragging
            ? "border-primary bg-primary/5 text-foreground"
            : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-muted/40"
        )}
      >
        <Upload className="h-5 w-5" aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">
            Drop photos or videos to deliver
          </span>
          <span className="text-xs text-muted-foreground">
            Photos are compressed to MLS-ready automatically. Originals
            stay intact.
          </span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </div>

      {pending.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {pending.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2 text-xs"
            >
              {p.stage === "error" ? (
                <span className="text-destructive">!</span>
              ) : (
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground"
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{p.name}</div>
                {p.stage === "error" ? (
                  <div className="text-destructive">{p.message}</div>
                ) : (
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-primary transition-[width]"
                        style={{ width: `${Math.round(p.ratio * 100)}%` }}
                      />
                    </div>
                    <span className="w-20 shrink-0 text-right tabular-nums text-muted-foreground">
                      {p.stage === "compressing"
                        ? "Compressing…"
                        : `${Math.round(p.ratio * 100)}%`}
                    </span>
                  </div>
                )}
              </div>
              {p.stage === "error" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removePending(p.id)}
                  aria-label="Dismiss"
                >
                  ×
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {files.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => {
            const Icon =
              f.kind === "photo"
                ? ImageIcon
                : f.kind === "video"
                  ? Video
                  : FileIcon;
            return (
              <li
                key={f.id}
                className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-xs"
              >
                <Icon
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{f.name}</div>
                  <div className="text-muted-foreground">
                    {f.kind === "photo" && f.compressed
                      ? `Original ${formatBytes(f.original.size)} · MLS ${formatBytes(f.compressed.size)}`
                      : formatBytes(f.original.size)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {f.compressed ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-7 px-2 text-[11px]"
                    >
                      <a
                        href={f.compressed.url}
                        target="_blank"
                        rel="noreferrer"
                        download={f.name.replace(/\.[^.]+$/, "") + "-mls.jpg"}
                      >
                        <Download className="mr-1 h-3 w-3" aria-hidden />
                        MLS
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                    className="h-7 px-2 text-[11px]"
                  >
                    <a
                      href={f.original.url}
                      target="_blank"
                      rel="noreferrer"
                      download={f.name}
                    >
                      <Download className="mr-1 h-3 w-3" aria-hidden />
                      Original
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(f)}
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Delete ${deleteTarget?.name}?`}
        description="The file is removed from storage for both you and the client. This can't be undone."
        confirmLabel="Delete file"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
