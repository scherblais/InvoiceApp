import { useMemo } from "react";
import { CalendarPlus, ChevronRight } from "lucide-react";
import {
  COLOR_DOT,
  STATUS_CHIP_DARK,
  STATUS_CHIP_LIGHT,
  STATUS_META,
  addDays,
  compareEvents,
  eventColor,
  normalizeStatus,
  toISODate,
  type EventStatus,
} from "@/lib/calendar";
import { formatTime12 } from "@/lib/format";
import { useTheme } from "@/contexts/theme-context";
import { eventClientId, type CalEvent, type Client } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EventContextMenu } from "@/components/calendar/event-context-menu";

interface AgendaViewProps {
  events: CalEvent[];
  clients: Client[];
  onEventClick: (id: string) => void;
  onDuplicate: (ev: CalEvent) => void;
  onStatusChange: (id: string, status: EventStatus) => void;
  onDelete: (id: string) => void;
}

export function AgendaView({
  events,
  clients,
  onEventClick,
  onDuplicate,
  onStatusChange,
  onDelete,
}: AgendaViewProps) {
  const { theme } = useTheme();

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  // Two buckets: dated events grouped by day for the rolling 30-day window,
  // plus dateless events (status `received`/`pending` that haven't been
  // booked onto a day yet) pinned to the top so they don't get lost.
  const { dated, unscheduled, todayISOStr, tomorrowISO } = useMemo(() => {
    const today = new Date();
    const tISO = toISODate(today);
    const tomISO = toISODate(addDays(today, 1));
    const endISO = toISODate(addDays(today, 30));
    const datedEvents = events
      .filter(
        (e): e is CalEvent & { date: string } =>
          !!e.date && e.date >= tISO && e.date <= endISO
      )
      .sort(compareEvents);
    const undated = events
      .filter((e) => !e.date)
      .sort((a, b) => (a.address ?? a.title ?? "").localeCompare(b.address ?? b.title ?? ""));

    const byDate = new Map<string, CalEvent[]>();
    for (const ev of datedEvents) {
      const arr = byDate.get(ev.date) ?? [];
      arr.push(ev);
      byDate.set(ev.date, arr);
    }
    return {
      dated: Array.from(byDate.entries()),
      unscheduled: undated,
      todayISOStr: tISO,
      tomorrowISO: tomISO,
    };
  }, [events]);

  if (dated.length === 0 && unscheduled.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
          <CalendarPlus className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
        <div className="text-sm font-medium">
          Nothing on the books for the next 30 days.
        </div>
        <div className="text-xs text-muted-foreground">
          Press{" "}
          <kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            N
          </kbd>{" "}
          or hit <span className="font-medium text-foreground">New</span> to add
          a shoot.
        </div>
      </div>
    );
  }

  const renderRow = (ev: CalEvent) => {
    const color = eventColor(ev, clientById);
    const status = normalizeStatus(ev.status);
    const cid = eventClientId(ev);
    const client = cid ? clientById.get(cid) : null;
    const chip =
      theme === "dark" ? STATUS_CHIP_DARK[status] : STATUS_CHIP_LIGHT[status];
    const baseAddress = (ev.address || ev.title || "Untitled").trim();
    const address = ev.unit ? `${baseAddress}, Apt ${ev.unit}` : baseAddress;
    const time = ev.start ? formatTime12(ev.start) : null;
    const clientLabel = client?.name || client?.company || "";
    const showContact =
      !!ev.contactName && ev.contactName !== clientLabel;

    return (
      <li key={ev.id}>
        <EventContextMenu
          event={ev}
          onOpen={() => onEventClick(ev.id)}
          onDuplicate={() => onDuplicate(ev)}
          onStatusChange={(s) => onStatusChange(ev.id, s)}
          onDelete={() => onDelete(ev.id)}
        >
          <button
            type="button"
            onClick={() => onEventClick(ev.id)}
            className="group relative flex w-full items-stretch gap-3 rounded-md px-2 py-3 -mx-2 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
          >
            {/* Time gutter — fixed width so events on the same day align
                vertically and become scannable. */}
            <div className="w-14 shrink-0 pt-0.5 text-xs tabular-nums text-muted-foreground sm:w-20">
              {time ?? (
                <span className="italic text-muted-foreground/60">All day</span>
              )}
            </div>

            {/* Color accent bar — replaces the old dot, doubles as a
                client-color marker without competing for visual weight. */}
            <span
              aria-hidden
              className="w-[3px] shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_DOT[color] }}
            />

            {/* Title + meta */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium leading-snug">
                {address}
              </div>
              {clientLabel || showContact ? (
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0 text-xs text-muted-foreground">
                  {clientLabel ? (
                    <span className="truncate">{clientLabel}</span>
                  ) : null}
                  {showContact ? (
                    <span className="truncate text-muted-foreground/70">
                      {ev.contactName}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Status pill — uses the same tinted-chip vocabulary as
                the rest of the app. */}
            <span
              className="shrink-0 self-center rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: chip.bg, color: chip.fg }}
            >
              {STATUS_META[status].label}
            </span>

            {/* Hover affordance — desktop only, no-op on touch devices. */}
            <ChevronRight
              aria-hidden
              className="hidden h-4 w-4 shrink-0 self-center text-muted-foreground/30 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100 sm:block"
            />
          </button>
        </EventContextMenu>
      </li>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-6 md:px-8">
        {unscheduled.length > 0 ? (
          <section className="mb-10 flex flex-col">
            <header className="sticky top-0 z-10 -mx-2 flex items-baseline gap-2.5 border-b border-border/60 bg-background/95 px-2 py-2.5 backdrop-blur-sm">
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Unscheduled
              </span>
              <h2 className="text-sm font-semibold">No date yet</h2>
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {unscheduled.length}
              </span>
            </header>
            <ul className="flex flex-col">{unscheduled.map(renderRow)}</ul>
          </section>
        ) : null}

        {dated.map(([date, dayEvents]) => {
          const d = new Date(`${date}T12:00:00`);
          const isToday = date === todayISOStr;
          const isTomorrow = date === tomorrowISO;
          const pillLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : null;
          const pillTone = isToday
            ? "bg-primary/15 text-primary"
            : "bg-muted text-foreground";
          const dateLabel = d.toLocaleDateString("en-CA", {
            weekday: "long",
            month: "long",
            day: "numeric",
          });
          return (
            <section key={date} className="mb-10 flex flex-col">
              <header className="sticky top-0 z-10 -mx-2 flex items-baseline gap-2.5 border-b border-border/60 bg-background/95 px-2 py-2.5 backdrop-blur-sm">
                {pillLabel ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider",
                      pillTone
                    )}
                  >
                    {pillLabel}
                  </span>
                ) : null}
                <h2 className="text-sm font-semibold">{dateLabel}</h2>
                <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                  {dayEvents.length}
                </span>
              </header>
              <ul className="flex flex-col">{dayEvents.map(renderRow)}</ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
