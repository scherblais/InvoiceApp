import { useEffect, useMemo, useState } from "react";
import { downloadZip } from "client-zip";
import {
  Check,
  Download,
  Loader2,
  Sparkles,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Lightbox } from "@/components/shared/lightbox";
import type { SharedFile } from "@/lib/shared";
import { formatBytes } from "@/lib/storage";
import { logActivity, logOnce } from "@/lib/activity";
import { cn } from "@/lib/utils";

interface DeliveryGalleryProps {
  title: string;
  /** Friendly date label shown under the title. */
  subtitle?: string;
  files: SharedFile[];
  onClose: () => void;
  /** Used to pick sensible default file names inside generated zips. */
  addressHint?: string;
  /** Share token for logging activity back to the photographer. */
  token?: string;
  /** Display name of the client — denormalized into activity writes. */
  clientName?: string;
}

/** Download a single URL as a blob + trigger a save dialog. Uses
 *  CORS-enabled fetch so the browser actually downloads instead of
 *  navigating to the preview. */
async function downloadOne(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const blob = await res.blob();
  triggerBlobDownload(blob, filename);
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Delay revoke so the download actually starts on some browsers.
  setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
}

function safeSlug(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "delivery";
}

export function DeliveryGallery({
  title,
  subtitle,
  files,
  onClose,
  addressHint,
  token,
  clientName,
}: DeliveryGalleryProps) {
  const photos = useMemo(() => files.filter((f) => f.kind === "photo"), [files]);
  const videos = useMemo(() => files.filter((f) => f.kind === "video"), [files]);
  const others = useMemo(
    () => files.filter((f) => f.kind !== "photo" && f.kind !== "video"),
    [files]
  );

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [bulkState, setBulkState] = useState<
    | { status: "idle" }
    | { status: "zipping"; variant: "mls" | "originals"; ratio: number }
    | { status: "error"; message: string }
  >({ status: "idle" });
  const [singleDownload, setSingleDownload] = useState<string | null>(null);

  // Lock page scroll while the modal is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Log a "gallery_opened" activity once per gallery per session so
  // the photographer's feed doesn't get hammered if the client
  // reopens the same modal a few times.
  useEffect(() => {
    if (!token) return;
    logOnce(`gallery:${token}:${title}`, () => {
      void logActivity(token, {
        type: "gallery_opened",
        clientName,
        eventLabel: title,
      });
    });
  }, [token, title, clientName]);

  const hasMls = photos.some((p) => p.compressed);
  const baseSlug = safeSlug(addressHint || title);

  const handleDownloadOne = async (
    file: SharedFile,
    variant: "original" | "compressed"
  ) => {
    const srcUrl =
      variant === "compressed" && file.compressed
        ? file.compressed.url
        : file.original.url;
    const suffix = variant === "compressed" ? "-mls.jpg" : "";
    const nameNoExt = file.name.replace(/\.[^.]+$/, "");
    const originalExt = file.name.match(/\.[^.]+$/)?.[0] ?? "";
    const fname =
      variant === "compressed"
        ? `${nameNoExt}${suffix}`
        : `${nameNoExt}${originalExt || ""}`;
    try {
      setSingleDownload(file.id + ":" + variant);
      await downloadOne(srcUrl, fname);
      if (token) {
        void logActivity(token, {
          type: "file_downloaded",
          clientName,
          eventLabel: title,
          fileLabel:
            variant === "compressed" ? "MLS version" : file.name,
        });
      }
    } catch (err) {
      // Fallback: open in new tab if fetch fails (CORS hiccups, etc.)
      window.open(srcUrl, "_blank", "noopener");
      console.error("single download failed, opened in tab instead", err);
    } finally {
      setSingleDownload(null);
    }
  };

  /**
   * Build a ZIP of the requested variant and stream it to the user.
   * Uses client-zip so we don't buffer 500 MB in memory first — it
   * reads each file, pipes it into the archive, and finally produces
   * a Blob the browser saves. Progress is by file count, not bytes,
   * to keep the math cheap.
   */
  const handleBulkZip = async (variant: "mls" | "originals") => {
    const list = photos
      .map((p) => {
        if (variant === "mls" && p.compressed) return { file: p, url: p.compressed.url, ext: "jpg", tag: "mls" };
        if (variant === "originals") {
          const ext = p.name.match(/\.([^.]+)$/)?.[1] ?? "jpg";
          return { file: p, url: p.original.url, ext, tag: "orig" };
        }
        return null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);

    if (!list.length) return;

    setBulkState({ status: "zipping", variant, ratio: 0 });
    try {
      // Build the file stream for client-zip. Each entry is a fetch
      // Response; client-zip reads them lazily.
      const entries = await Promise.all(
        list.map(async (item, i) => {
          const res = await fetch(item.url);
          if (!res.ok) throw new Error(`${item.file.name}: ${res.status}`);
          setBulkState({
            status: "zipping",
            variant,
            ratio: (i + 1) / (list.length * 2),
          });
          const padded = String(i + 1).padStart(2, "0");
          return {
            name: `${baseSlug}-${item.tag}-${padded}.${item.ext}`,
            input: res,
          };
        })
      );
      setBulkState({ status: "zipping", variant, ratio: 0.5 });
      const zipBlob = await downloadZip(entries).blob();
      setBulkState({ status: "zipping", variant, ratio: 1 });
      const zipName = `${baseSlug}-${variant === "mls" ? "MLS" : "originals"}.zip`;
      triggerBlobDownload(zipBlob, zipName);
      if (token) {
        void logActivity(token, {
          type: "files_downloaded_zip",
          clientName,
          eventLabel: title,
          fileLabel: variant === "mls" ? "MLS photos" : "original photos",
          fileCount: list.length,
        });
      }
      setTimeout(() => setBulkState({ status: "idle" }), 600);
    } catch (err) {
      setBulkState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to package zip",
      });
    }
  };

  const zipping = bulkState.status === "zipping";
  const totalBytes = files.reduce((s, f) => s + f.original.size, 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Media delivery for ${title}`}
      className="fixed inset-0 z-40 flex flex-col bg-background animate-in fade-in-0 slide-in-from-bottom-2 duration-200 ease-out motion-reduce:animate-none"
    >
      {/* Header */}
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {subtitle ? `${subtitle} · ` : null}
            {photos.length} {photos.length === 1 ? "photo" : "photos"}
            {videos.length
              ? ` · ${videos.length} ${videos.length === 1 ? "video" : "videos"}`
              : ""}
            {" · "}
            {formatBytes(totalBytes)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close gallery"
          className="shrink-0"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </header>

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-4 py-3 md:px-6">
        {hasMls ? (
          <Button
            onClick={() => handleBulkZip("mls")}
            disabled={zipping}
            size="sm"
          >
            {zipping && bulkState.variant === "mls" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {zipping && bulkState.variant === "mls"
              ? `Packaging ${Math.round(bulkState.ratio * 100)}%`
              : `Download all MLS · ${photos.filter((p) => p.compressed).length} photos`}
          </Button>
        ) : null}
        {photos.length ? (
          <Button
            variant="outline"
            onClick={() => handleBulkZip("originals")}
            disabled={zipping}
            size="sm"
          >
            {zipping && bulkState.variant === "originals" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {zipping && bulkState.variant === "originals"
              ? `Packaging ${Math.round(bulkState.ratio * 100)}%`
              : `Download originals · ${photos.length} photos`}
          </Button>
        ) : null}
        <div className="ml-auto text-xs text-muted-foreground">
          {hasMls
            ? "MLS versions are web-optimized. Originals are full resolution."
            : null}
        </div>
      </div>

      {bulkState.status === "error" ? (
        <div className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive md:px-6">
          {bulkState.message}
        </div>
      ) : null}

      {/* Gallery body */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
        {photos.length > 0 ? (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Photos
            </h3>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4 xl:grid-cols-5">
              {photos.map((p, i) => {
                const thumb = p.compressed?.url ?? p.original.url;
                return (
                  <li key={p.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="block aspect-square w-full overflow-hidden rounded-md border bg-muted transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Open photo ${i + 1}`}
                    >
                      <img
                        src={thumb}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      />
                    </button>
                    {/* Hover action — single-photo MLS download without
                        opening the lightbox. */}
                    {p.compressed ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDownloadOne(p, "compressed");
                        }}
                        className={cn(
                          "absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        )}
                        aria-label={`Download MLS version of photo ${i + 1}`}
                      >
                        {singleDownload === p.id + ":compressed" ? (
                          <Check className="h-3 w-3" aria-hidden />
                        ) : (
                          <Download className="h-3 w-3" aria-hidden />
                        )}
                        MLS
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {videos.length > 0 ? (
          <section className={photos.length > 0 ? "mt-8" : ""}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Videos
            </h3>
            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {videos.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-col gap-2 rounded-lg border bg-card p-3"
                >
                  <video
                    src={v.original.url}
                    controls
                    preload="metadata"
                    className="aspect-video w-full rounded-md bg-black"
                  />
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{v.name}</div>
                      <div className="text-muted-foreground">
                        {formatBytes(v.original.size)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadOne(v, "original")}
                      disabled={singleDownload === v.id + ":original"}
                    >
                      {singleDownload === v.id + ":original" ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                      )}
                      Download
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {others.length > 0 ? (
          <section className={photos.length || videos.length ? "mt-8" : ""}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Files
            </h3>
            <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
              {others.map((f) => (
                <li key={f.id} className="flex items-center gap-3 p-3 text-sm">
                  <VideoIcon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(f.original.size)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadOne(f, "original")}
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-center text-sm text-muted-foreground">
            <Sparkles className="h-6 w-6" aria-hidden />
            Nothing uploaded for this listing yet.
          </div>
        ) : null}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          photos={photos}
          index={lightboxIndex}
          onIndex={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onDownload={handleDownloadOne}
        />
      ) : null}
    </div>
  );
}
