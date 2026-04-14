import { useMemo } from "react";
import { CalendarX2 } from "lucide-react";
import {
  COLOR_DOT,
  STATUS_META,
  addDays,
  compareEvents,
  eventColor,
  normalizeStatus,
  toISODate,
} from "@/lib/calendar";
import { formatTime12 } from "@/lib/format";
import type { CalEvent, Realtor } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AgendaViewProps {
  events: CalEvent[];
  realtors: Realtor[];
  onEventClick: (id: string) => void;
}

export function AgendaView({ events, realtors, onEventClick }: AgendaViewProps) {
  const realtorById = useMemo(() => {
    const m = new Map<string, Realtor>();
    for (const r of realtors) m.set(r.id, r);
    return m;
  }, [realtors]);

  const groups = useMemo(() => {
    const today = new Date();
    const todayISO = toISODate(today);
    const endISO = toISODate(addDays(today, 30));
    const upcoming = events
      .filter((e) => e.date >= todayISO && e.date <= endISO)
      .sort(compareEvents);
    const byDate = new Map<string, CalEvent[]>();
    for (const ev of upcoming) {
      const arr = byDate.get(ev.date) ?? [];
      arr.push(ev);
      byDate.set(ev.date, arr);
    }
    return Array.from(byDate.entries());
  }, [events]);

  if (groups.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center text-muted-foreground">
        <CalendarX2 className="h-10 w-10" />
        <div className="text-sm">No upcoming events in the next 30 days.</div>
      </div>
    );
  }

  const todayISOStr = toISODate(new Date());
  const tomorrowISO = toISODate(addDays(new Date(), 1));

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        {groups.map(([date, dayEvents]) => {
          const d = new Date(`${date}T12:00:00`);
          const label =
            date === todayISOStr
              ? "Today"
              : date === tomorrowISO
              ? "Tomorrow"
              : d.toLocaleDateString("en-CA", { weekday: "long" });
          const sub = d.toLocaleDateString("en-CA", {
            month: "long",
            day: "numeric",
          });
          return (
            <section key={date} className="flex flex-col gap-2">
              <header className="flex items-baseline gap-2 border-b pb-1">
                <h2 className="text-sm font-semibold">{label}</h2>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </header>
              <ul className="flex flex-col divide-y">
                {dayEvents.map((ev) => {
                  const color = eventColor(ev);
                  const status = normalizeStatus(ev.status);
                  const realtor = ev.realtorId
                    ? realtorById.get(ev.realtorId)
                    : null;
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onEventClick(ev.id)}
                        className="group flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40 px-2 -mx-2 rounded"
                      >
                        <span
                          style={{ backgroundColor: COLOR_DOT[color] }}
                          className="h-2 w-2 shrink-0 rounded-full"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {ev.title || ev.address || "Untitled"}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {ev.start ? (
                              <span className="tabular-nums">
                                {formatTime12(ev.start)}
                              </span>
                            ) : (
                              <span>All day</span>
                            )}
                            {realtor ? (
                              <span className="truncate">· {realtor.name}</span>
                            ) : null}
                            {ev.contactName ? (
                              <span className="truncate">
                                · {ev.contactName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <span
                          className={cn(
                            "flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"
                          )}
                        >
                          <span
                            style={{ backgroundColor: STATUS_META[status].dot }}
                            className="h-1.5 w-1.5 rounded-full"
                          />
                          {STATUS_META[status].label}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
