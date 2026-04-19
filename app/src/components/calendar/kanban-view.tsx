import { useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import {
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

  return (
    <div className="flex-1 overflow-x-auto p-4 md:p-6">
      <div className="flex h-full gap-3 min-w-max">
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
                "flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/20 transition-colors",
                isOver && "border-primary bg-primary/5"
              )}
            >
              <header className="flex items-center justify-between border-b px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: meta.dot }}
                    className="h-2 w-2 rounded-full"
                  />
                  <span className="text-sm font-medium">{meta.label}</span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </header>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
                {items.map((ev) => {
                  const color = eventColor(ev, clientById);
                  const cid = eventClientId(ev);
                  const client = cid ? clientById.get(cid) : null;
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
                      className={cn(
                        "group flex flex-col gap-1.5 rounded-md border bg-background p-2.5 text-left transition-all hover:border-foreground/20",
                        draggingId === ev.id && "opacity-40"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          style={{ backgroundColor: COLOR_DOT[color] }}
                          className="mt-1 h-2 w-2 shrink-0 rounded-full"
                        />
                        <span className="truncate text-sm font-medium leading-tight">
                          {ev.title || ev.address || "Untitled"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {ev.date ? (
                          <span className="tabular-nums">
                            {formatShortDate(ev.date)}
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            TBD
                          </span>
                        )}
                        {ev.start ? (
                          <span className="tabular-nums">
                            · {formatTime12(ev.start)}
                          </span>
                        ) : null}
                        {ev.files?.length ? (
                          <span
                            className="ml-auto inline-flex items-center gap-1 tabular-nums"
                            title={`${ev.files.length} file${ev.files.length === 1 ? "" : "s"} attached`}
                          >
                            <Paperclip className="h-3 w-3" aria-hidden />
                            {ev.files.length}
                          </span>
                        ) : null}
                      </div>
                      {client ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {client.name || client.company}
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
