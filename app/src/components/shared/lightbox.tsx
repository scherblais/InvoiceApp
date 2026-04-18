import { useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/storage";
import type { SharedFile } from "@/lib/shared";

interface LightboxProps {
  photos: SharedFile[];
  index: number;
  onIndex: (next: number) => void;
  onClose: () => void;
  /**
   * Called when the user clicks a Download button. Kept external so the
   * parent can share a single "downloading" state across the gallery.
   */
  onDownload: (file: SharedFile, variant: "original" | "compressed") => void;
}

/**
 * Fullscreen photo viewer for the client delivery gallery. Keyboard:
 *   ← / →  navigate between photos
 *   Esc    close
 * Click the backdrop (but not the photo itself) to close too.
 */
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  onDownload,
}: LightboxProps) {
  const current = photos[index];

  const prev = useCallback(() => {
    onIndex((index - 1 + photos.length) % photos.length);
  }, [index, photos.length, onIndex]);

  const next = useCallback(() => {
    onIndex((index + 1) % photos.length);
  }, [index, photos.length, onIndex]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [prev, next, onClose]);

  if (!current) return null;

  // Lightbox renders the compressed variant (smaller, already plenty
  // sharp for on-screen preview). Originals are reserved for explicit
  // downloads so we don't push 20 MB per click.
  const previewUrl = current.compressed?.url ?? current.original.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{current.name}</div>
          <div className="text-xs text-white/60 tabular-nums">
            {index + 1} / {photos.length}
            {current.compressed ? (
              <>
                {" · "}
                MLS {formatBytes(current.compressed.size)} · Original{" "}
                {formatBytes(current.original.size)}
              </>
            ) : (
              <> · {formatBytes(current.original.size)}</>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {current.compressed ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onDownload(current, "compressed")}
              className="bg-white/10 text-white hover:bg-white/20"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              MLS
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onDownload(current, "original")}
            className="bg-white/10 text-white hover:bg-white/20"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Original
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>

      {/* Image + prev / next */}
      <div
        className="relative flex flex-1 items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          key={current.id}
          src={previewUrl}
          alt={current.name}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
        {photos.length > 1 ? (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
