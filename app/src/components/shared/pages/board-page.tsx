import { Paperclip } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useSharedData } from "@/contexts/shared-context";
import { COLOR_DOT } from "@/lib/calendar";
import {
  eventLocation,
  formatShortDate,
  formatTime,
} from "@/components/shared/format-utils";
import type { SharedEvent } from "@/lib/shared";
import { cn } from "@/lib/utils";

/**
 * Each lane mirrors the photographer's Kanban configuration 1:1 —
 * same id, same label, same dot color pulled from the shared event
 * palette. Cards are read-only (no drag handlers) but the visual
 * treatment is identical.
 */
const LANES: {
  id: "received" | "pending" | "scheduled" | "delivered";
  label: string;
  dot: string;
  emptyCopy: string;
}[] = [
  { id: "received", label: "Received", dot: COLOR_DOT.rose, emptyCopy: "No received shoots" },
  { id: "pending", label: "Pending", dot: COLOR_DOT.pink, emptyCopy: "No pending shoots" },
  { id: "scheduled", label: "Scheduled", dot: COLOR_DOT.blue, emptyCopy: "No scheduled shoots" },
  { id: "delivered", label: "Delivered", dot: COLOR_DOT.green, emptyCopy: "No delivered shoots" },
];

export function BoardPage() {
  const { lanes, openGallery } = useSharedData();

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Board" subtitle="Every shoot by status" />
      <div className="flex-1 overflow-x-auto p-4 md:p-6">
        <div className="flex h-full gap-3 min-w-max">
          {LANES.map((lane) => {
            const items = lanes[lane.id] ?? [];
            return (
              <div
                key={lane.id}
                className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors"
              >
                <header className="flex items-center justify-between border-b px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: lane.dot }}
                      className="h-2 w-2 rounded-full"
                    />
                    <span className="text-sm font-medium">{lane.label}</span>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </header>
                <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {items.map((ev) => (
                    <BoardCard
                      key={`${ev.date}-${ev.address}`}
                      ev={ev}
                      onOpen={
                        lane.id === "delivered" &&
                        (ev.files?.length ?? 0) > 0
                          ? () => openGallery(ev)
                          : undefined
                      }
                    />
                  ))}
                  {items.length === 0 ? <EmptyLane lane={lane} /> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BoardCard({
  ev,
  onOpen,
}: {
  ev: SharedEvent;
  onOpen?: () => void;
}) {
  const files = ev.files?.length ?? 0;
  const content = (
    <>
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1 h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: dotForEvent(ev) }}
        />
        <span className="truncate text-sm font-medium leading-tight">
          {eventLocation(ev)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {ev.date ? (
          <span className="tabular-nums">{formatShortDate(ev.date)}</span>
        ) : (
          <span className="font-medium text-foreground">TBD</span>
        )}
        {ev.start ? (
          <span className="tabular-nums">· {formatTime(ev.start)}</span>
        ) : null}
        {files ? (
          <span
            className="ml-auto inline-flex items-center gap-1 tabular-nums"
            title={`${files} file${files === 1 ? "" : "s"}`}
          >
            <Paperclip className="h-3 w-3" aria-hidden />
            {files}
          </span>
        ) : null}
      </div>
      {ev.notes ? (
        <p className="line-clamp-2 text-xs text-muted-foreground">{ev.notes}</p>
      ) : null}
    </>
  );

  if (onOpen) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex flex-col gap-1.5 rounded-md border bg-background p-2.5 text-left transition-all hover:border-foreground/20"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-md border bg-background p-2.5">
      {content}
    </div>
  );
}

function EmptyLane({ lane }: { lane: (typeof LANES)[number] }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/20 px-3 py-10 text-center">
      <span
        aria-hidden
        className="h-2 w-2 rounded-full opacity-60"
        style={{ backgroundColor: lane.dot }}
      />
      <p className="text-xs text-muted-foreground">{lane.emptyCopy}</p>
    </div>
  );
}

/** Fall back to the lane's dot color when the shared event doesn't
 *  carry an explicit `color`. Matches the photographer's behavior —
 *  client-assigned colors live on the photographer's side; the
 *  public shared payload doesn't include the clientsById map. */
function dotForEvent(ev: SharedEvent): string {
  // ev.color is a free-form string like "blue" — if it matches one of
  // our known keys, use that; otherwise fall back to the scheduled
  // blue so cards never render a missing color.
  const key = (ev.color ?? "blue") as keyof typeof COLOR_DOT;
  return COLOR_DOT[key] ?? COLOR_DOT.blue;
}
