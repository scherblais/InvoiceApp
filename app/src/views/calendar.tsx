import { useCallback, useEffect, useMemo, useState } from "react";
import { useData } from "@/contexts/data-context";
import {
  MONTH_NAMES,
  addDays,
  getWeekStart,
  toISODate,
  type EventStatus,
} from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { MonthView } from "@/components/calendar/month-view";
import { WeekView } from "@/components/calendar/week-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import { KanbanView } from "@/components/calendar/kanban-view";
import { EventModal } from "@/components/calendar/event-modal";
import type { CalendarViewMode } from "@/components/calendar/types";

const VIEW_KEY = "lumeria_cal_view";

export function CalendarView() {
  const { calEvents, clients, saveCalEvents } = useData();

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
      const idx = calEvents.findIndex((e) => e.id === ev.id);
      const next =
        idx >= 0
          ? calEvents.map((e) => (e.id === ev.id ? ev : e))
          : [...calEvents, ev];
      saveCalEvents(next);
    },
    [calEvents, saveCalEvents]
  );

  const handleDelete = useCallback(
    (id: string) => {
      saveCalEvents(calEvents.filter((e) => e.id !== id));
    },
    [calEvents, saveCalEvents]
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

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        view={view}
        onView={setView}
        title={title}
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
