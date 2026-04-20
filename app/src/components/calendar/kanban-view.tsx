import { useMemo, useState } from "react";
import { MapPin, Paperclip } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";
import {
  COLOR_CHIP_DARK,
  COLOR_CHIP_LIGHT,
  COLOR_DOT,
  STATUS_META,
  STATUS_ORDER,
  compareEvents,
  eventColor,
  normalizeStatus,
  type EventStatus,
} from "@/lib/calendar";
import { formatShortDate, formatTime12 } from "@/lib/format";
import { eventClientId, type CalEvent, type Client } from "@/lib/types";
import { cn } from "@/lib/utils";

interface KanbanViewProps {
  events: CalEvent[];
  clients: Client[];
  onEventClick: (id: string) => void;
  onStatusChange: (id: string, status: EventStatus) => void;
}

export function KanbanView({
  events,
  clients,
  onEventClick,
  onStatusChange,
}: KanbanViewProps) {
  const { theme } = useTheme();
  const [dragOver, setDragOver] = useState<EventStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const columns = useMemo(() => {
    const buckets = new Map<EventStatus, CalEvent[]>();
    for (const s of STATUS_ORDER) buckets.set(s, []);
    for (const ev of events) {
      const s = normalizeStatus(ev.status);
      buckets.get(s)!.push(ev);
    }
    for (const arr of buckets.values()) arr.sort(compareEvents);
    return buckets;
  }, [events]);

  const chipPalette = theme === "dark" ? COLOR_CHIP_DARK : COLOR_CHIP_LIGHT;

  // Grid layout — columns divide the available width evenly on desktop
  // and stack on narrower viewports so nothing gets squeezed into a
  // horizontal scroll trench like the old fixed-width rail. Matches
  // the AlignUI week-view treatment where every column carries equal
  // visual weight.
  return (
    <div className="flex-1 overflow-hidden p-4 md:p-6">
      <div className="grid h-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {STATUS_ORDER.map((status) => {
          const items = columns.get(status) ?? [];
          const meta = STATUS_META[status];
          const isOver = dragOver === status;
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(status);
              }}
              onDragLeave={() => {
                setDragOver((cur) => (cur === status ? null : cur));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const id = e.dataTransfer.getData("text/event-id");
                if (id) onStatusChange(id, status);
              }}
              className={cn(
                "flex min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/20 transition-colors",
                isOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
              )}
            >
              <header className="flex items-center justify-between border-b bg-background/60 px-3.5 py-2.5 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: meta.dot }}
                    className="h-2 w-2 rounded-full"
                  />
                  <span className="text-[13px] font-semibold tracking-tight">
                    {meta.label}
                  </span>
                  <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2">
                {items.map((ev) => {
                  const color = eventColor(ev, clientById);
                  const chip = chipPalette[color];
                  const cid = eventClientId(ev);
                  const client = cid ? clientById.get(cid) : null;
                  const address = ev.unit
                    ? `${ev.address}, Apt ${ev.unit}`
                    : ev.address ?? "";
                  return (
                    <button
                      key={ev.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/event-id", ev.id);
                        e.dataTransfer.effectAllowed = "move";
                        setDraggingId(ev.id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      onClick={() => onEventClick(ev.id)}
                      style={{ backgroundColor: chip.bg }}
                      className={cn(
                        // Pastel tonal card — pulls bg from the event's
                        // color palette so scanning the board by
                        // category is as fast as scanning by status.
                        "group flex cursor-grab flex-col gap-1.5 rounded-lg p-3 text-left ring-1 ring-inset ring-black/5 transition-all hover:-translate-y-0.5 hover:shadow-sm active:cursor-grabbing dark:ring-white/5",
                        draggingId === ev.id && "opacity-40"
                      )}
                    >
                      <div
                        className="truncate text-[13px] font-semibold leading-tight"
                        style={{ color: chip.fg }}
                      >
                        {ev.title || ev.address || "Untitled"}
                      </div>
                      <div
                        className="flex items-center gap-1.5 text-[11px] tabular-nums opacity-80"
                        style={{ color: chip.fg }}
                      >
                        {ev.date ? (
                          <span>{formatShortDate(ev.date)}</span>
                        ) : (
                          <span className="font-semibold">TBD</span>
                        )}
                        {ev.start ? (
                          <span>· {formatTime12(ev.start)}</span>
                        ) : null}
                        {ev.files?.length ? (
                          <span
                            className="ml-auto inline-flex items-center gap-1"
                            title={`${ev.files.length} file${ev.files.length === 1 ? "" : "s"} attached`}
                          >
                            <Paperclip
                              className="h-3 w-3"
                              aria-hidden
                            />
                            {ev.files.length}
                          </span>
                        ) : null}
                      </div>
                      {address ? (
                        <div
                          className="flex min-w-0 items-center gap-1 text-[11px] opacity-75"
                          style={{ color: chip.fg }}
                        >
                          <MapPin
                            className="h-3 w-3 shrink-0"
                            aria-hidden
                          />
                          <span className="truncate">{address}</span>
                        </div>
                      ) : null}
                      {client ? (
                        <div
                          className="inline-flex items-center gap-1.5 text-[11px] font-medium"
                          style={{ color: chip.fg }}
                        >
                          <span
                            aria-hidden
                            className="h-1.5 w-1.5 rounded-full opacity-80"
                            style={{ backgroundColor: COLOR_DOT[color] }}
                          />
                          <span className="truncate opacity-90">
                            {client.name || client.company}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
                {items.length === 0 ? (
                  <EmptyColumn
                    label={meta.label}
                    dot={meta.dot}
                    isDragTarget={isOver}
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Per-column empty state. Pulls the status color from STATUS_META so
 * each lane looks distinctly empty-but-present instead of showing a
 * generic "no items" blob. Morphs into a subtle drop target when a
 * card is being dragged over the column.
 */
function EmptyColumn({
  label,
  dot,
  isDragTarget,
}: {
  label: string;
  dot: string;
  isDragTarget: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/20 px-3 py-10 text-center transition-colors",
        isDragTarget && "border-primary bg-primary/5"
      )}
    >
      <span
        className="h-2 w-2 rounded-full opacity-60"
        style={{ backgroundColor: dot }}
        aria-hidden
      />
      <p className="text-xs font-medium text-muted-foreground">
        No {label.toLowerCase()} shoots
      </p>
      <p className="text-[10.5px] text-muted-foreground/60">
        {isDragTarget ? `Drop to mark as ${label.toLowerCase()}` : "Drag a card here"}
      </p>
    </div>
  );
}
