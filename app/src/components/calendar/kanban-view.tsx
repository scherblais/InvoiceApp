import { useMemo, useState } from "react";
import { Paperclip } from "lucide-react";
import { EventContextMenu } from "@/components/calendar/event-context-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  STATUS_META,
  STATUS_ORDER,
  compareEvents,
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
  onDuplicate: (event: CalEvent) => void;
  onDelete: (id: string) => void;
}

function clientInitials(c: Client | null | undefined): string {
  if (!c) return "?";
  const source = c.name || c.company || "";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Board view, modeled after Clarian's "Firms" layout:
 *
 *   [●] Status · count            ← column header (no chrome)
 *
 *   ┌─────────────────────────┐
 *   │ Address                 │    ← card: white, thin border, no tonal fill
 *   │ 〇 Client · contact     │
 *   │                         │
 *   │ Shoot date    Jun 15    │   ← label ↔ value metadata rows
 *   │ Start time    1:00 PM   │
 *   │ Files         📎 3      │
 *   └─────────────────────────┘
 *
 * The column organizes the shoot by status, so cards no longer need
 * a tonal fill to tell the user "this is Pending / Received / etc."
 * — they're neutral white, letting the addresses read as the primary
 * sorting signal inside a column. Column chrome (bg, border) drops
 * away too so the page background breathes through between lanes.
 */
export function KanbanView({
  events,
  clients,
  onEventClick,
  onStatusChange,
  onDuplicate,
  onDelete,
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
    <div className="flex-1 overflow-hidden p-4 md:p-6">
      <div className="grid h-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
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
                // Columns are invisible containers — just a flex stack
                // of cards, no bg / border chrome. Drop target state
                // uses a dashed primary ring that materializes around
                // the whole lane without rearranging its layout.
                "flex min-h-0 flex-col gap-3 rounded-xl p-1 transition-colors",
                isOver && "bg-primary/5 ring-2 ring-primary/30"
              )}
            >
              <header className="flex items-center gap-2 px-1">
                <span
                  aria-hidden
                  style={{ backgroundColor: meta.dot }}
                  className="h-2 w-2 rounded-full"
                />
                <span className="text-sm font-medium">{meta.label}</span>
                <span className="text-sm text-muted-foreground tabular-nums">
                  {items.length}
                </span>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
                {items.map((ev) => {
                  const cid = eventClientId(ev);
                  const client = cid ? clientById.get(cid) : null;
                  const address = ev.unit
                    ? `${ev.address}, Apt ${ev.unit}`
                    : ev.address ?? "Untitled";
                  const contactLabel =
                    client?.name || client?.company || ev.contactName || "";
                  const hasFiles = (ev.files?.length ?? 0) > 0;
                  return (
                    <EventContextMenu
                      key={ev.id}
                      event={ev}
                      onOpen={() => onEventClick(ev.id)}
                      onDuplicate={() => onDuplicate(ev)}
                      onStatusChange={(s) => onStatusChange(ev.id, s)}
                      onDelete={() => onDelete(ev.id)}
                    >
                      <button
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
                          "group flex w-full cursor-grab flex-col gap-2.5 rounded-lg border bg-card p-3 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-sm active:cursor-grabbing",
                          draggingId === ev.id && "opacity-40"
                        )}
                      >
                        {/* Title row — address is the primary reference */}
                        <div className="truncate text-[13px] font-semibold leading-tight">
                          {address}
                        </div>

                        {/* Contact row: avatar + client · contactName */}
                        {contactLabel ? (
                          <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                            <Avatar className="size-5">
                              <AvatarFallback className="text-[9px] font-medium">
                                {clientInitials(client)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{contactLabel}</span>
                            {client && ev.contactName && client.name !== ev.contactName ? (
                              <span className="truncate">· {ev.contactName}</span>
                            ) : null}
                          </div>
                        ) : null}

                        {/* Metadata rows — label ↔ value */}
                        <div className="flex flex-col gap-1 pt-1.5 text-[11.5px]">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              Shoot date
                            </span>
                            <span className="font-medium tabular-nums">
                              {ev.date ? formatShortDate(ev.date) : "TBD"}
                            </span>
                          </div>
                          {ev.start ? (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Start time
                              </span>
                              <span className="font-medium tabular-nums">
                                {formatTime12(ev.start)}
                              </span>
                            </div>
                          ) : null}
                          {hasFiles ? (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">
                                Files
                              </span>
                              <span className="inline-flex items-center gap-1 font-medium tabular-nums">
                                <Paperclip
                                  className="size-3 text-muted-foreground"
                                  aria-hidden
                                />
                                {ev.files!.length}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </EventContextMenu>
                  );
                })}
                {items.length === 0 ? (
                  <EmptyColumn
                    label={meta.label}
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
 * Empty-state tile for a column with no cards. Quiet dashed border
 * so it reads as "intentionally empty" rather than missing, and
 * morphs into a primary-ring drop target when a card is being
 * dragged over the lane.
 */
function EmptyColumn({
  label,
  isDragTarget,
}: {
  label: string;
  isDragTarget: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-10 text-center transition-colors",
        isDragTarget && "border-primary bg-primary/5"
      )}
    >
      <p className="text-xs text-muted-foreground">
        No {label.toLowerCase()} shoots
      </p>
      <p className="text-[10.5px] text-muted-foreground/60">
        {isDragTarget ? `Drop to mark as ${label.toLowerCase()}` : "Drag a card here"}
      </p>
    </div>
  );
}
