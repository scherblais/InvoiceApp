import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarPlus, Inbox, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useData } from "@/contexts/data-context";
import {
  COLOR_DOT,
  STATUS_META,
  eventColor,
  normalizeStatus,
} from "@/lib/calendar";
import { formatShortDate, todayISO } from "@/lib/format";
import { eventClientId, type CalEvent } from "@/lib/types";
import { newEventId } from "@/lib/id";
import { useInquiries, type Inquiry } from "@/hooks/use-inquiries";

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
  const { calEvents, clientsById, saveCalEvents } = useData();
  const { inquiries, remove: removeInquiry } = useInquiries();
  const navigate = useNavigate();
  const iso = todayISO();

  /**
   * Promote an inquiry into a real calendar event. Copies the
   * inquiry's fields into a CalEvent with status "received" (so it
   * surfaces in this same panel under its new identity), deletes the
   * inquiry, and deep-links into the event modal for quick review.
   */
  const convertInquiry = async (inq: Inquiry) => {
    const eventId = newEventId();
    const ev: CalEvent = {
      id: eventId,
      title: inq.address,
      address: inq.address,
      date: inq.desiredDate || undefined,
      start: inq.desiredTime || undefined,
      status: "received",
      contactName: inq.name,
      notes: [
        inq.company ? `Company: ${inq.company}` : null,
        inq.email ? `Email: ${inq.email}` : null,
        inq.phone ? `Phone: ${inq.phone}` : null,
        inq.notes ? `\n${inq.notes}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      ...(inq.email || inq.phone
        ? ({
            contactPhone: inq.phone,
            contactEmail: inq.email,
          } as Partial<CalEvent>)
        : {}),
    };
    saveCalEvents([...calEvents, ev]);
    await removeInquiry(inq.id);
    toast.success("Inquiry converted", {
      description: "Open the event to assign a client and schedule.",
    });
    navigate(`/calendar?event=${eventId}`);
  };

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
  const totalCount = items.length + inquiries.length;
  const isEmpty = visible.length === 0 && inquiries.length === 0;

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-5 pb-5">
        <div className="flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          <CardTitle className="text-sm font-medium">To schedule</CardTitle>
          {totalCount > 0 ? (
            <Badge variant="secondary" className="rounded-full">
              {totalCount}
            </Badge>
          ) : null}
        </div>
        {totalCount > 0 ? (
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
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CalendarPlus
              className="h-7 w-7 text-muted-foreground/60"
              aria-hidden
            />
            <span>Nothing waiting to book</span>
          </div>
        ) : (
          <>
            {inquiries.length > 0 ? (
              <>
                <div className="flex items-center gap-2 border-b bg-primary/5 px-5 py-2">
                  <Inbox className="h-3 w-3 text-primary" aria-hidden />
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-primary">
                    New inquiries · {inquiries.length}
                  </span>
                </div>
                <ul className="divide-y">
                  {inquiries.slice(0, 5).map((inq) => (
                    <li key={inq.id}>
                      <div className="group flex w-full items-start gap-3 px-5 py-3.5 text-left">
                        <Sparkles
                          className="mt-1 h-3.5 w-3.5 shrink-0 text-primary"
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {inq.address}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-muted-foreground">
                            <span className="truncate">{inq.name}</span>
                            {inq.company ? (
                              <>
                                <span>·</span>
                                <span className="truncate">{inq.company}</span>
                              </>
                            ) : null}
                          </div>
                          {inq.desiredDate ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                              Wants {formatShortDate(inq.desiredDate)}
                              {inq.desiredTime ? ` · ${inq.desiredTime}` : ""}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => void convertInquiry(inq)}
                          >
                            Convert
                          </Button>
                          <button
                            type="button"
                            onClick={() => void removeInquiry(inq.id)}
                            className="text-[10.5px] text-muted-foreground hover:text-destructive"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {visible.length > 0 ? (
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
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
