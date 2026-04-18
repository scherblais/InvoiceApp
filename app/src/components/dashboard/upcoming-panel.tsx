import { useNavigate } from "react-router-dom";
import { CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/data-context";
import { formatTime12, todayISO } from "@/lib/format";
import { COLOR_DOT, eventColor } from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";

export function UpcomingPanel({ calEvents }: { calEvents: CalEvent[] }) {
  const navigate = useNavigate();
  const { clientsById } = useData();
  const iso = todayISO();

  const upcoming = calEvents
    .filter((e) => e.date >= iso)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.start ?? a.startTime ?? "").localeCompare(b.start ?? b.startTime ?? "")
    )
    .slice(0, 6);

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between py-4 border-b">
        <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
        {upcoming.length > 0 ? (
          <Badge variant="secondary" className="rounded-full">
            {upcoming.length}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CalendarDays
              className="h-8 w-8 text-muted-foreground/60"
              aria-hidden
            />
            <span>No upcoming events</span>
          </div>
        ) : (
          <ul className="divide-y">
            {upcoming.map((ev) => {
              const evDate = new Date(`${ev.date}T12:00:00`);
              const isToday = ev.date === iso;
              const dateLabel = isToday
                ? "Today"
                : evDate.toLocaleDateString("en-CA", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  });
              const time = formatTime12(ev.start ?? ev.startTime ?? "");
              const dotColor = COLOR_DOT[eventColor(ev, clientsById)];
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/calendar")}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        style={{ backgroundColor: dotColor }}
                        className="h-2 w-2 shrink-0 rounded-full"
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {ev.title ?? ev.type ?? "Event"}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {dateLabel}
                        </div>
                      </div>
                    </div>
                    {time ? (
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {time}
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
