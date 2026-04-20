import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "@/contexts/data-context";
import {
  MONTH_NAMES,
  addDays,
  getWeekStart,
  toISODate,
  type EventStatus,
} from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";
import {
  removeEventDraftLink,
  syncEventDraftLink,
} from "@/lib/invoice-link";
import { monthName } from "@/lib/invoice";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import { KanbanView } from "@/components/calendar/kanban-view";
import { EventModal } from "@/components/calendar/event-modal";
import type { CalendarViewMode } from "@/components/calendar/types";

const VIEW_KEY = "lumeria_cal_view";

export function CalendarView() {
  const {
    calEvents,
    clients,
    clientsById,
    drafts,
    saveCalEvents,
    saveDrafts,
  } = useData();

  const [view, setView] = useState<CalendarViewMode>(() => {
    const saved = localStorage.getItem(VIEW_KEY) as CalendarViewMode | null;
    return saved ?? "week";
  });
  useEffect(() => {
    localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  const [cursor, setCursor] = useState<Date>(() => new Date());

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [defaultTime, setDefaultTime] = useState<string>("");

  // Deep-link support: dashboard panels (To Schedule, Attention) pass
  // ?event=<id> so we can open the event directly from a cross-link.
  // Remove the param once we've honored it so subsequent navigations
  // don't loop the modal back open.
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const eid = searchParams.get("event");
    if (!eid) return;
    const found = calEvents.find((e) => e.id === eid);
    if (!found) return;
    setEditingId(eid);
    setModalOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete("event");
    setSearchParams(next, { replace: true });
  }, [searchParams, calEvents, setSearchParams]);

  const editingEvent = useMemo(
    () => (editingId ? calEvents.find((e) => e.id === editingId) ?? null : null),
    [editingId, calEvents]
  );

  const openNew = useCallback(
    (iso?: string, time?: string) => {
      setEditingId(null);
      setDefaultDate(iso ?? toISODate(cursor));
      setDefaultTime(time ?? "");
      setModalOpen(true);
    },
    [cursor]
  );

  const openEdit = useCallback((id: string) => {
    setEditingId(id);
    setDefaultDate("");
    setDefaultTime("");
    setModalOpen(true);
  }, []);

  const handleSave = useCallback(
    (ev: CalEvent) => {
      // 1. Persist the event itself.
      const idx = calEvents.findIndex((e) => e.id === ev.id);
      const nextEvents =
        idx >= 0
          ? calEvents.map((e) => (e.id === ev.id ? ev : e))
          : [...calEvents, ev];
      saveCalEvents(nextEvents);

      // 2. Auto-link to the client's draft invoice. The helper
      // upserts / moves / strips a line item tagged with the event id
      // as the event's client + date + address changes over its life.
      const result = syncEventDraftLink(ev, drafts);
      if (result.action === "none") return;
      saveDrafts(result.drafts);

      // 3. Surface what just happened so the photographer isn't
      // confused about extra drafts appearing — small signals,
      // suppressed for pure address-text edits (updated) so saves
      // don't spam the toast queue.
      const client = ev.clientId ? clientsById.get(ev.clientId) : null;
      const clientLabel = client
        ? client.name || client.company || "client"
        : "client";
      const monthLabel = result.month ? monthName(result.month) : "";
      if (result.action === "created") {
        toast.success(`Added to ${monthLabel} draft`, {
          description: `Linked to ${clientLabel}'s invoice.`,
        });
      } else if (result.action === "moved") {
        toast.success(`Moved to ${monthLabel} draft`, {
          description: `Now billed to ${clientLabel}.`,
        });
      } else if (result.action === "removed") {
        toast.info("Removed from draft invoice", {
          description: `Event no longer has a client + date + address.`,
        });
      }
    },
    [calEvents, drafts, saveCalEvents, saveDrafts, clientsById]
  );

  const handleDelete = useCallback(
    (id: string) => {
      saveCalEvents(calEvents.filter((e) => e.id !== id));
      // Also strip any draft line item linked to this event — don't
      // keep billing for a shoot that no longer exists.
      const nextDrafts = removeEventDraftLink(id, drafts);
      if (nextDrafts !== drafts) saveDrafts(nextDrafts);
    },
    [calEvents, drafts, saveCalEvents, saveDrafts]
  );

  const handleStatusChange = useCallback(
    (id: string, status: EventStatus) => {
      saveCalEvents(
        calEvents.map((e) => (e.id === id ? { ...e, status } : e))
      );
    },
    [calEvents, saveCalEvents]
  );

  const handlePrev = useCallback(() => {
    setCursor((d) => {
      if (view === "month") {
        return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      }
      if (view === "week") return addDays(d, -7);
      return d;
    });
  }, [view]);

  const handleNext = useCallback(() => {
    setCursor((d) => {
      if (view === "month") {
        return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      }
      if (view === "week") return addDays(d, 7);
      return d;
    });
  }, [view]);

  const handleToday = useCallback(() => setCursor(new Date()), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in inputs/textareas or when modal open
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (modalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
      else if (e.key.toLowerCase() === "t") handleToday();
      else if (e.key.toLowerCase() === "n") openNew();
      else if (e.key.toLowerCase() === "m") setView("month");
      else if (e.key.toLowerCase() === "w") setView("week");
      else if (e.key.toLowerCase() === "a") setView("agenda");
      else if (e.key.toLowerCase() === "b") setView("kanban");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, handlePrev, handleNext, handleToday, openNew]);

  const title = useMemo(() => {
    if (view === "month") {
      return `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`;
    }
    if (view === "week") {
      const start = getWeekStart(cursor);
      const end = addDays(start, 6);
      const sameMonth = start.getMonth() === end.getMonth();
      const startLabel = start.toLocaleDateString("en-CA", {
        month: "short",
        day: "numeric",
      });
      const endLabel = sameMonth
        ? String(end.getDate())
        : end.toLocaleDateString("en-CA", {
            month: "short",
            day: "numeric",
          });
      return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
    }
    if (view === "agenda") return "Agenda";
    return "Board";
  }, [view, cursor]);

  // Event count that maps to what the user's actually looking at —
  // drives the "X shoots" subtitle under the calendar title.
  const visibleCount = useMemo(() => {
    if (view === "month") {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      return calEvents.filter((e) => {
        if (!e.date) return false;
        const d = new Date(`${e.date}T12:00:00`);
        return d.getFullYear() === y && d.getMonth() === m;
      }).length;
    }
    if (view === "week") {
      const start = getWeekStart(cursor);
      const end = addDays(start, 7);
      const startISO = toISODate(start);
      const endISO = toISODate(end);
      return calEvents.filter(
        (e) => !!e.date && e.date >= startISO && e.date < endISO
      ).length;
    }
    if (view === "agenda") {
      const todayISOStr = toISODate(new Date());
      const endISOStr = toISODate(addDays(new Date(), 30));
      return calEvents.filter(
        (e) => !!e.date && e.date >= todayISOStr && e.date <= endISOStr
      ).length;
    }
    return calEvents.length;
  }, [view, cursor, calEvents]);

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        view={view}
        onView={setView}
        title={title}
        count={visibleCount}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onNew={() => openNew()}
        showNav={view === "month" || view === "week"}
      />

      {view === "month" ? (
        <MonthView
          year={cursor.getFullYear()}
          month={cursor.getMonth()}
          events={calEvents}
          onEventClick={openEdit}
          onDayClick={(iso) => openNew(iso)}
        />
      ) : null}

      {view === "week" ? (
        <WeekView
          weekStart={getWeekStart(cursor)}
          events={calEvents}
          onEventClick={openEdit}
          onSlotClick={(iso, hour) =>
            openNew(iso, `${String(hour).padStart(2, "0")}:00`)
          }
        />
      ) : null}

      {view === "agenda" ? (
        <AgendaView
          events={calEvents}
          clients={clients}
          onEventClick={openEdit}
        />
      ) : null}

      {view === "kanban" ? (
        <KanbanView
          events={calEvents}
          clients={clients}
          onEventClick={openEdit}
          onStatusChange={handleStatusChange}
        />
      ) : null}

      <EventModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        event={editingEvent}
        defaultDate={defaultDate}
        defaultTime={defaultTime}
        clients={clients}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
