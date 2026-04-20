import { ArrowRight, Camera, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useSharedData } from "@/contexts/shared-context";
import {
  eventLocation,
  formatFullDate,
} from "@/components/shared/format-utils";
import type { SharedEvent } from "@/lib/shared";
import { cn } from "@/lib/utils";

/**
 * Gallery-style view of every delivered shoot. This is where the
 * client comes to download photos, so it leads hard on visuals:
 * every card is a big photo mosaic with file counts and a "View &
 * download" CTA. Clicking opens the full DeliveryGallery modal.
 */
export function DeliveriesPage() {
  const { lanes, openGallery } = useSharedData();
  const delivered = lanes.delivered;
  const withFiles = delivered.filter((ev) => (ev.files?.length ?? 0) > 0);
  const pending = delivered.filter((ev) => (ev.files?.length ?? 0) === 0);

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Deliveries"
        subtitle={
          withFiles.length
            ? `${withFiles.length} ${
                withFiles.length === 1 ? "gallery" : "galleries"
              } ready to download`
            : "Your photographer's uploads will show up here"
        }
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {delivered.length === 0 ? (
          <EmptyDeliveries />
        ) : (
          <div className="flex flex-col gap-10">
            {withFiles.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {withFiles.map((ev) => (
                  <li key={`${ev.date}-${ev.address}`}>
                    <GalleryCard ev={ev} onOpen={() => openGallery(ev)} />
                  </li>
                ))}
              </ul>
            ) : null}

            {pending.length > 0 ? (
              <section className="flex flex-col gap-3">
                <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Awaiting upload
                </h2>
                <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                  {pending.map((ev) => (
                    <li
                      key={`${ev.date}-${ev.address}`}
                      className="flex items-center gap-3 p-4 text-sm"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <ImageIcon className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                          {eventLocation(ev)}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {ev.date ? formatFullDate(ev.date) : "Date TBD"}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Files coming soon
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function GalleryCard({ ev, onOpen }: { ev: SharedEvent; onOpen: () => void }) {
  const photos = (ev.files ?? []).filter((f) => f.kind === "photo");
  const videos = (ev.files ?? []).filter((f) => f.kind === "video").length;
  const thumbs = photos.slice(0, 3);
  const overflow = photos.length - thumbs.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      {thumbs.length > 0 ? (
        <div
          className={cn(
            "grid gap-px bg-border",
            thumbs.length === 1 && "grid-cols-1",
            thumbs.length === 2 && "grid-cols-2",
            thumbs.length >= 3 && "grid-cols-[2fr_1fr]"
          )}
        >
          {thumbs.length >= 3 ? (
            <>
              <div className="aspect-[4/3] bg-muted">
                <img
                  src={thumbs[0].compressed?.url ?? thumbs[0].original.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <div className="grid grid-rows-2 gap-px">
                {thumbs.slice(1, 3).map((t, i) => (
                  <div key={i} className="relative bg-muted">
                    <img
                      src={t.compressed?.url ?? t.original.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    {i === 1 && overflow > 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
                        +{overflow}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            thumbs.map((t, i) => (
              <div key={i} className="aspect-[4/3] overflow-hidden bg-muted">
                <img
                  src={t.compressed?.url ?? t.original.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/60 text-muted-foreground">
          <ImageIcon className="h-8 w-8" aria-hidden />
        </div>
      )}

      <div className="flex flex-col gap-2 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">
            {eventLocation(ev)}
          </h3>
          {ev.date ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatFullDate(ev.date)}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {photos.length ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" aria-hidden />
                <span className="tabular-nums">{photos.length}</span>{" "}
                {photos.length === 1 ? "photo" : "photos"}
              </span>
            ) : null}
            {videos ? (
              <span className="inline-flex items-center gap-1">
                <span className="tabular-nums">{videos}</span>{" "}
                {videos === 1 ? "video" : "videos"}
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            View &amp; download
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </button>
  );
}

function EmptyDeliveries() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-14 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
        <Camera className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium">No deliveries yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When a shoot wraps up and photos are ready, they'll show up here to
          download.
        </p>
      </div>
    </div>
  );
}
