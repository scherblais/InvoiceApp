import { useMemo } from "react";
import {
  DAY_NAMES_SHORT,
  compareEvents,
  getMonthGrid,
  isToday,
  toISODate,
  type EventStatus,
} from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventChip } from "@/components/calendar/event-chip";
import { EventContextMenu } from "@/components/calendar/event-context-menu";

interface MonthViewProps {
  year: number;
  month: number; // 0-based
  events: CalEvent[];
  onEventClick: (id: string) => void;
  onDayClick: (iso: string) => void;
  onDuplicate: (ev: CalEvent) => void;
  onStatusChange: (id: string, status: EventStatus) => void;
  onDelete: (id: string) => void;
}

export function MonthView({
  year,
  month,
  events,
  onEventClick,
  onDayClick,
  onDuplicate,
  onStatusChange,
  onDelete,
}: MonthViewProps) {
  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);
  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of events) {
      // Dateless events live on the dashboard's To Schedule panel —
      // we skip them here so they don't silently drop into the
      // month grid's first bucket.
      if (!ev.date) continue;
      const arr = map.get(ev.date) ?? [];
      arr.push(ev);
      map.set(ev.date, arr);
    }
    for (const arr of map.values()) arr.sort(compareEvents);
    return map;
  }, [events]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
        {DAY_NAMES_SHORT.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6 divide-x divide-y [&>*]:border-border">
        {cells.map((d) => {
          const iso = toISODate(d);
          const inMonth = d.getMonth() === month;
          const today = isToday(iso);
          const dayEvents = byDate.get(iso) ?? [];
          const visible = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visible.length;
          return (
            <div
              key={iso}
              role="button"
              tabIndex={0}
              onClick={() => onDayClick(iso)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onDayClick(iso);
                }
              }}
              className={cn(
                "flex min-h-24 cursor-pointer flex-col gap-1 p-1.5 text-left transition-colors hover:bg-muted/40",
                !inMonth && "bg-muted/20 text-muted-foreground/60",
                today && "bg-primary/5"
              )}
            >
              <div
                className={cn(
                  "flex h-6 items-center justify-end px-1 text-xs font-medium tabular-nums",
                  today &&
                    "self-end rounded-full bg-primary px-2 text-primary-foreground"
                )}
              >
                {d.getDate()}
              </div>
              <div className="flex flex-col gap-0.5 overflow-hidden">
                {visible.map((ev) => (
                  <EventContextMenu
                    key={ev.id}
                    event={ev}
                    onOpen={() => onEventClick(ev.id)}
                    onDuplicate={() => onDuplicate(ev)}
                    onStatusChange={(s) => onStatusChange(ev.id, s)}
                    onDelete={() => onDelete(ev.id)}
                  >
                    <EventChip
                      event={ev}
                      onClick={() => onEventClick(ev.id)}
                      compact
                    />
                  </EventContextMenu>
                ))}
                {overflow > 0 ? (
                  <span className="px-1.5 text-[10px] font-medium text-muted-foreground">
                    +{overflow} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
