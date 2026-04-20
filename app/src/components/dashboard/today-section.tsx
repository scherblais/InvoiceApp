import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Coffee, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import {
  COLOR_DOT,
  STATUS_META,
  compareEvents,
  eventColor,
  normalizeStatus,
} from "@/lib/calendar";
import { formatTime12, todayISO } from "@/lib/format";
import { eventClientId, type CalEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PreShootBrief } from "@/components/dashboard/pre-shoot-brief";

/**
 * Hero card for the dashboard. Photographers care about one thing
 * more than anything else first thing in the morning: "what am I
 * shooting today?" This card answers that question before they even
 * think to scroll. Everything else on the dashboard is secondary.
 *
 * Empty state is intentional — quiet, not a void. It looks like a
 * deliberate "you're clear" instead of a broken card.
 */
export function TodaySection() {
  const { calEvents, clientsById, config } = useData();
  const navigate = useNavigate();
  const iso = todayISO();

  const todayShoots = useMemo(() => {
    return [...calEvents]
      .filter((e) => e.date === iso)
      .sort(compareEvents);
  }, [calEvents, iso]);

  const nowMin = useMemo(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }, []);

  // Surface a briefing card when a non-delivered shoot starts within
  // the next 4 hours (or is currently underway and not yet an hour
  // past). Pulls the earliest matching shoot — the one you actually
  // need to prep for right now.
  const briefEvent = useMemo(() => {
    for (const ev of todayShoots) {
      if (normalizeStatus(ev.status) === "delivered") continue;
      if (!ev.start) continue;
      const m = toMinutes(ev.start);
      const diff = m - nowMin;
      if (diff <= 240 && diff >= -60) return ev;
    }
    return null;
  }, [todayShoots, nowMin]);

  const briefClient = briefEvent
    ? clientsById.get(eventClientId(briefEvent) ?? "") ?? null
    : null;

  if (todayShoots.length === 0) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Coffee className="h-5 w-5" aria-hidden />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-base font-semibold tracking-tight">
            Nothing on deck today
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            No shoots scheduled. Good time for editing, admin, or a
            break.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {briefEvent ? (
        <PreShootBrief
          event={briefEvent}
          client={briefClient}
          config={config}
        />
      ) : null}
      <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-end justify-between gap-3 px-6 pt-5">
        <div>
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Today
          </div>
          <div className="mt-1 text-[15px] font-semibold tracking-tight">
            {todayShoots.length}{" "}
            {todayShoots.length === 1 ? "shoot scheduled" : "shoots scheduled"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Open calendar
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>

      <ul className="mt-4 divide-y border-t">
        {todayShoots.map((ev) => (
          <TodayRow
            key={ev.id}
            event={ev}
            nowMin={nowMin}
            onOpen={() => navigate("/calendar")}
          />
        ))}
      </ul>
    </Card>
    </div>
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function TodayRow({
  event,
  nowMin,
  onOpen,
}: {
  event: CalEvent;
  nowMin: number;
  onOpen: () => void;
}) {
  const { clientsById } = useData();
  const color = eventColor(event, clientsById);
  const status = normalizeStatus(event.status);
  const cid = eventClientId(event);
  const client = cid ? clientsById.get(cid) : null;

  const startMin = event.start ? toMinutes(event.start) : null;
  const isPast = startMin != null && startMin + 60 < nowMin;
  const isUpNext =
    startMin != null && startMin <= nowMin + 120 && startMin >= nowMin - 30;

  const address = event.unit
    ? `${event.address}, Apt ${event.unit}`
    : event.address ?? event.title ?? "Untitled";

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/40",
          isPast && "opacity-60"
        )}
      >
        {/* Time pill on the left — feels like a timetable entry. */}
        <div className="flex w-16 shrink-0 flex-col items-start">
          <div className="text-sm font-semibold tabular-nums leading-none">
            {event.start ? formatTime12(event.start) : "All day"}
          </div>
          {isUpNext ? (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/30">
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              Up next
            </span>
          ) : null}
        </div>

        {/* Main detail block */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: COLOR_DOT[color] }}
            />
            <span className="truncate text-sm font-medium">{address}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {client ? (
              <span className="truncate">
                {client.name || client.company}
              </span>
            ) : null}
            {event.contactName ? (
              <>
                {client ? <span>·</span> : null}
                <span className="truncate">{event.contactName}</span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right: status + nav arrow */}
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: STATUS_META[status].dot }}
            />
            {STATUS_META[status].label}
          </span>
          <ArrowRight
            className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      </button>
    </li>
  );
}
