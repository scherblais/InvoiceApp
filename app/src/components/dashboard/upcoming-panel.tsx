import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/data-context";
import { COLOR_DOT, compareEvents, eventColor } from "@/lib/calendar";
import { formatTime12, todayISO } from "@/lib/format";
import type { CalEvent } from "@/lib/types";

/**
 * Upcoming-within-the-week panel. Intentionally narrower than the
 * full calendar view — groups by day so the photographer can eyeball
 * density (is Wednesday slammed?) without reading times. Today is
 * omitted because the Today section above already owns it.
 */
export function UpcomingPanel({ calEvents }: { calEvents: CalEvent[] }) {
  const navigate = useNavigate();
  const { clientsById } = useData();
  const iso = todayISO();

  // Look seven days forward, skipping today (the Today hero card
  // handles today). Stops when we hit the eighth day boundary.
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 8);

  const upcoming = useMemo(() => {
    const end = endDate.toISOString().slice(0, 10);
    return calEvents
      .filter(
        (e): e is CalEvent & { date: string } =>
          !!e.date && e.date > iso && e.date <= end
      )
      .sort(compareEvents);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calEvents, iso]);

  const byDate = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const ev of upcoming) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [upcoming]);

  const dates = Array.from(byDate.keys());

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-5 pb-5">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Upcoming week</CardTitle>
          {upcoming.length > 0 ? (
            <Badge variant="secondary" className="rounded-full">
              {upcoming.length}
            </Badge>
          ) : null}
        </div>
        {upcoming.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate("/calendar")}
            className="group inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See all
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CalendarDays
              className="h-7 w-7 text-muted-foreground/60"
              aria-hidden
            />
            <span>Nothing in the next 7 days</span>
          </div>
        ) : (
          <ul className="divide-y">
            {dates.map((date) => {
              const list = byDate.get(date) ?? [];
              return (
                <li key={date} className="px-5 py-3.5">
                  <DayGroup
                    date={date}
                    events={list}
                    onOpen={() => navigate("/calendar")}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );

  function DayGroup({
    date,
    events,
    onOpen,
  }: {
    date: string;
    events: CalEvent[];
    onOpen: () => void;
  }) {
    const d = new Date(`${date}T12:00:00`);
    const day = d.toLocaleDateString("en-CA", { weekday: "short" });
    const monthDay = d.toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    });
    return (
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full items-start gap-4 text-left"
      >
        <div className="flex w-14 shrink-0 flex-col items-start">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {day}
          </span>
          <span className="text-sm font-semibold tracking-tight tabular-nums">
            {monthDay}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <ul className="flex flex-col gap-1">
            {events.slice(0, 3).map((ev) => {
              const c = eventColor(ev, clientsById);
              const loc = ev.unit
                ? `${ev.address}, Apt ${ev.unit}`
                : ev.address ?? ev.title ?? "Untitled";
              return (
                <li
                  key={ev.id}
                  className="flex min-w-0 items-center gap-2 text-xs"
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: COLOR_DOT[c] }}
                  />
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {ev.start ? formatTime12(ev.start) : "All day"}
                  </span>
                  <span className="min-w-0 truncate">{loc}</span>
                </li>
              );
            })}
            {events.length > 3 ? (
              <li className="text-[11px] text-muted-foreground">
                +{events.length - 3} more
              </li>
            ) : null}
          </ul>
        </div>
        <ArrowRight
          className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    );
  }
}
