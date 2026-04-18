import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarPlus } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/contexts/data-context";
import {
  COLOR_DOT,
  STATUS_META,
  eventColor,
  normalizeStatus,
} from "@/lib/calendar";
import { formatShortDate, todayISO } from "@/lib/format";
import { eventClientId } from "@/lib/types";

/**
 * Queue of shoots that the photographer knows about but hasn't
 * confirmed on the calendar yet — anything sitting in `received` or
 * `pending` status. Dateless entries rise to the top (they're the
 * ones that haven't even been penciled in), then date-ascending.
 *
 * Clicking a row deep-links to the calendar with ?event=<id>, which
 * the calendar view reads on mount to auto-open the event modal so
 * the photographer can schedule / confirm / reassign in one click.
 */
export function ToSchedulePanel() {
  const { calEvents, clientsById } = useData();
  const navigate = useNavigate();
  const iso = todayISO();

  const items = useMemo(() => {
    return calEvents
      .filter((e) => {
        const s = normalizeStatus(e.status);
        return s === "received" || s === "pending";
      })
      .sort((a, b) => {
        // Dateless first — those need the most urgent attention.
        const aEmpty = !a.date;
        const bEmpty = !b.date;
        if (aEmpty !== bEmpty) return aEmpty ? -1 : 1;
        // Then past-before-future so the oldest pending rises to the
        // top within the date-bearing group.
        return (a.date || "").localeCompare(b.date || "");
      });
  }, [calEvents]);

  const visible = items.slice(0, 8);

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-5">
        <CardTitle className="text-sm font-medium">To schedule</CardTitle>
        {items.length > 0 ? (
          <Badge variant="secondary" className="rounded-full">
            {items.length}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CalendarPlus
              className="h-7 w-7 text-muted-foreground/60"
              aria-hidden
            />
            <span>Nothing waiting to book</span>
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((ev) => {
              const color = eventColor(ev, clientsById);
              const status = normalizeStatus(ev.status);
              const cid = eventClientId(ev);
              const client = cid ? clientsById.get(cid) : null;
              const address = ev.unit
                ? `${ev.address}, Apt ${ev.unit}`
                : ev.address ?? ev.title ?? "Untitled";
              const isPast = !!ev.date && ev.date < iso;
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/calendar?event=${ev.id}`)}
                    className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                  >
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: COLOR_DOT[color] }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {address}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        {client ? (
                          <span className="truncate">
                            {client.name || client.company}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: STATUS_META[status].dot }}
                          />
                          {STATUS_META[status].label}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="text-right text-xs">
                        {ev.date ? (
                          <span
                            className={
                              isPast
                                ? "font-medium text-amber-600 tabular-nums dark:text-amber-400"
                                : "text-muted-foreground tabular-nums"
                            }
                          >
                            {formatShortDate(ev.date)}
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">
                            TBD
                          </span>
                        )}
                      </div>
                      <ArrowRight
                        className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </div>
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
