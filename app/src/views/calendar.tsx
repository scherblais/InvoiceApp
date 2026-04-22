import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useData } from "@/contexts/data-context";
import { type EventStatus } from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";
import {
  removeEventDraftLink,
  syncEventDraftLink,
} from "@/lib/invoice-link";
import { monthName } from "@/lib/invoice";
import { newEventId } from "@/lib/id";
import { CalendarHeader } from "@/components/calendar/calendar-header";
import { AgendaView } from "@/components/calendar/agenda-view";
import { EventModal } from "@/components/calendar/event-modal";

export function CalendarView() {
  const {
    calEvents,
    clients,
    clientsById,
    drafts,
    saveCalEvents,
    saveDrafts,
  } = useData();

  const [searchParams, setSearchParams] = useSearchParams();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [defaultDate, setDefaultDate] = useState<string>("");
  const [defaultTime, setDefaultTime] = useState<string>("");

  // Deep-link support: dashboard panels (To Schedule, Attention) pass
  // ?event=<id> so we can open the event directly from a cross-link.
  // Remove the param once we've honored it so subsequent navigations
  // don't loop the modal back open. Reacting to a URL change is a
  // legitimate useEffect pattern; the React 19 strict warning doesn't
  // apply.
  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  const editingEvent = useMemo(
    () => (editingId ? calEvents.find((e) => e.id === editingId) ?? null : null),
    [editingId, calEvents]
  );

  const openNew = useCallback(
    (iso?: string, time?: string) => {
      setEditingId(null);
      setDefaultDate(iso ?? "");
      setDefaultTime(time ?? "");
      setModalOpen(true);
    },
    []
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

  const handleDuplicate = useCallback(
    (ev: CalEvent) => {
      // Strip files and id — duplicated shoot is a brand-new slot
      // the photographer can edit. Everything else (address, client,
      // package-time-slot) carries over so duplicating a recurring
      // listing is a one-click operation.
      const { id: _oldId, files: _files, ...rest } = ev;
      void _oldId;
      void _files;
      const clone: CalEvent = {
        ...rest,
        id: newEventId(),
      };
      saveCalEvents([...calEvents, clone]);
      setEditingId(clone.id);
      setDefaultDate("");
      setDefaultTime("");
      setModalOpen(true);
      toast.success("Event duplicated", {
        description: "Opened the copy — adjust the date or time to save.",
      });
    },
    [calEvents, saveCalEvents]
  );

  // Agenda always shows the rolling "next 30 days" window — see AgendaView
  // for the exact slice. Header surfaces that count as the subtitle.
  const visibleCount = useMemo(() => {
    const today = new Date();
    const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const endISO = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    return calEvents.filter(
      (e) => !!e.date && e.date >= todayISO && e.date <= endISO
    ).length;
  }, [calEvents]);

  // Keyboard shortcuts — agenda doesn't navigate by date, so only the
  // "new event" shortcut remains useful here.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (modalOpen) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "n") openNew();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [modalOpen, openNew]);

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        title="Agenda"
        count={visibleCount}
        onNew={() => openNew()}
      />

      <AgendaView
        events={calEvents}
        clients={clients}
        onEventClick={openEdit}
        onDuplicate={handleDuplicate}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
      />

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
