import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime12, todayISO } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalEvent } from "@/lib/types";

const eventColors: Record<string, string> = {
  blue: "bg-[rgb(124,173,240)]",
  purple: "bg-[rgb(167,139,250)]",
  green: "bg-[rgb(109,212,168)]",
  amber: "bg-[rgb(245,201,107)]",
  pink: "bg-[rgb(240,160,196)]",
  teal: "bg-[rgb(94,197,192)]",
  rose: "bg-[rgb(244,135,127)]",
  indigo: "bg-[rgb(129,140,248)]",
};

export function UpcomingPanel({ calEvents }: { calEvents: CalEvent[] }) {
  const navigate = useNavigate();
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
    <Card className="gap-0 shadow-none">
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
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            No upcoming events
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
              const dotClass = eventColors[ev.color ?? "blue"] ?? eventColors.blue;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => navigate("/calendar")}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "h-2 w-2 shrink-0 rounded-full",
                          dotClass
                        )}
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
