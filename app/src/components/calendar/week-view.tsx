import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/contexts/theme-context";
import { useData } from "@/contexts/data-context";
import { EventContextMenu } from "@/components/calendar/event-context-menu";
import {
  COLOR_CHIP_DARK,
  COLOR_CHIP_LIGHT,
  DAY_NAMES_SHORT,
  addDays,
  eventColor,
  isToday,
  minutesFromHHMM,
  toISODate,
  type EventStatus,
} from "@/lib/calendar";
import { formatTime12 } from "@/lib/format";
import type { CalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  weekStart: Date;
  events: CalEvent[];
  onEventClick: (id: string) => void;
  onSlotClick: (iso: string, hour: number) => void;
  onDuplicate: (ev: CalEvent) => void;
  onStatusChange: (id: string, status: EventStatus) => void;
  onDelete: (id: string) => void;
}

const HOUR_HEIGHT = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({
  weekStart,
  events,
  onEventClick,
  onSlotClick,
  onDuplicate,
  onStatusChange,
  onDelete,
}: WeekViewProps) {
  const { theme } = useTheme();
  const { clientsById } = useData();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    // auto-scroll to 8 AM on mount
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 8 * HOUR_HEIGHT;
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, { allDay: CalEvent[]; timed: CalEvent[] }>();
    for (const d of days) {
      map.set(toISODate(d), { allDay: [], timed: [] });
    }
    for (const ev of events) {
      if (!ev.date) continue;
      const bucket = map.get(ev.date);
      if (!bucket) continue;
      if (ev.start) bucket.timed.push(ev);
      else bucket.allDay.push(ev);
    }
    return map;
  }, [days, events]);

  const todayIdx = days.findIndex((d) => isToday(toISODate(d)));

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Day header */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b bg-muted/30">
        <div />
        {days.map((d) => {
          const iso = toISODate(d);
          const today = isToday(iso);
          return (
            <div
              key={iso}
              className={cn(
                "flex flex-col items-center justify-center py-2 text-xs",
                today ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="font-medium">
                {DAY_NAMES_SHORT[d.getDay()]}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold tabular-nums",
                  today && "bg-primary text-primary-foreground"
                )}
              >
                {d.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* All-day row */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
        <div className="py-1 text-right pr-2 text-[10px] uppercase tracking-wide text-muted-foreground">
          all-day
        </div>
        {days.map((d) => {
          const iso = toISODate(d);
          const bucket = byDay.get(iso);
          return (
            <div
              key={iso}
              className="min-h-6 border-l p-0.5"
            >
              {bucket?.allDay.map((ev) => {
                const color = eventColor(ev, clientsById);
                const chip =
                  theme === "dark"
                    ? COLOR_CHIP_DARK[color]
                    : COLOR_CHIP_LIGHT[color];
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
                      onClick={() => onEventClick(ev.id)}
                      style={{ backgroundColor: chip.bg, color: chip.fg }}
                      className="mb-0.5 block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium"
                    >
                      {ev.title || ev.address || "Untitled"}
                    </button>
                  </EventContextMenu>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Hour grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          {/* Hour labels */}
          <div className="relative">
            {HOURS.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="relative border-b pr-2 text-right text-[10px] text-muted-foreground"
              >
                <span className="absolute right-2 -top-1.5 bg-background px-1">
                  {h === 0
                    ? ""
                    : h < 12
                    ? `${h} AM`
                    : h === 12
                    ? "12 PM"
                    : `${h - 12} PM`}
                </span>
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map((d, dayIdx) => {
            const iso = toISODate(d);
            const bucket = byDay.get(iso);
            const today = isToday(iso);
            return (
              <div
                key={iso}
                className={cn(
                  "relative border-l",
                  today && "bg-primary/5 dark:bg-black/25"
                )}
              >
                {HOURS.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onSlotClick(iso, h)}
                    style={{ height: HOUR_HEIGHT }}
                    className="block w-full border-b transition-colors hover:bg-muted/40"
                  />
                ))}
                {/* Timed events */}
                {bucket?.timed.map((ev) => {
                  const color = eventColor(ev, clientsById);
                  const chip =
                    theme === "dark"
                      ? COLOR_CHIP_DARK[color]
                      : COLOR_CHIP_LIGHT[color];
                  const startMin = minutesFromHHMM(ev.start!);
                  const endMin = ev.end
                    ? minutesFromHHMM(ev.end)
                    : startMin + 60;
                  const top = (startMin / 60) * HOUR_HEIGHT;
                  const height = Math.max(
                    24,
                    ((endMin - startMin) / 60) * HOUR_HEIGHT
                  );
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(ev.id);
                        }}
                        style={{
                          top,
                          height,
                          backgroundColor: chip.bg,
                          color: chip.fg,
                        }}
                        className="absolute left-0.5 right-0.5 overflow-hidden rounded-md px-2 py-1 text-left text-[11px] font-medium leading-tight ring-1 ring-inset ring-black/5 transition-opacity hover:opacity-85 dark:ring-white/5"
                      >
                        <div className="truncate tabular-nums text-[10px] opacity-80">
                          {formatTime12(ev.start)}
                        </div>
                        <div className="truncate font-semibold">
                          {ev.title || ev.address || "Untitled"}
                        </div>
                        {ev.contactName ? (
                          <div className="truncate text-[10px] opacity-70">
                            {ev.contactName}
                          </div>
                        ) : null}
                      </button>
                    </EventContextMenu>
                  );
                })}
                {/* Now indicator */}
                {todayIdx === dayIdx ? (
                  <div
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                    className="pointer-events-none absolute left-0 right-0 z-10"
                  >
                    <div className="relative h-px bg-rose-400">
                      <div className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-rose-400" />
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
