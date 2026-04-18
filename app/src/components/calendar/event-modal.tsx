import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { EventFiles } from "@/components/calendar/event-files";
import { useAuth } from "@/contexts/auth-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  STATUS_ORDER,
  STATUS_META,
  normalizeStatus,
  type EventStatus,
} from "@/lib/calendar";
import { eventClientId, type CalEvent, type Client } from "@/lib/types";

interface EventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalEvent | null; // null = new event
  defaultDate?: string;
  defaultTime?: string;
  clients: Client[];
  onSave: (ev: CalEvent) => void;
  onDelete?: (id: string) => void;
}

interface FormState {
  address: string;
  unit: string;
  date: string;
  start: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  clientId: string;
  status: EventStatus;
  notes: string;
}

function emptyForm(defaultDate: string, defaultTime = ""): FormState {
  return {
    address: "",
    unit: "",
    date: defaultDate,
    start: defaultTime,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    clientId: "",
    status: "scheduled",
    notes: "",
  };
}

function eventToForm(ev: CalEvent): FormState {
  // Legacy title may already include ", Apt X" — separate it back out.
  const rawTitle = ev.title ?? ev.address ?? "";
  let address = ev.address ?? rawTitle;
  let unit = ev.unit ?? "";
  if (!ev.address && rawTitle.includes(", Apt ")) {
    const [a, u] = rawTitle.split(", Apt ");
    address = a;
    unit = u;
  }
  return {
    address,
    unit,
    date: ev.date,
    start: ev.start ?? "",
    contactName: ev.contactName ?? "",
    contactPhone: (ev as { contactPhone?: string }).contactPhone ?? "",
    contactEmail: (ev as { contactEmail?: string }).contactEmail ?? "",
    clientId: eventClientId(ev) ?? "",
    status: normalizeStatus(ev.status),
    notes: ev.notes ?? "",
  };
}

export function EventModal({
  open,
  onOpenChange,
  event,
  defaultDate,
  defaultTime,
  clients,
  onSave,
  onDelete,
}: EventModalProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(() =>
    event ? eventToForm(event) : emptyForm(defaultDate ?? "", defaultTime)
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDeleteOpen(false);
    setForm(
      event ? eventToForm(event) : emptyForm(defaultDate ?? "", defaultTime)
    );
  }, [open, event, defaultDate, defaultTime]);

  const handleSave = () => {
    if (!form.address.trim()) {
      setError("Address is required");
      return;
    }
    const title = form.unit.trim()
      ? `${form.address.trim()}, Apt ${form.unit.trim()}`
      : form.address.trim();
    // Strip the deprecated `realtorId` field on save so new writes only carry
    // `clientId`. The legacy field is still tolerated on reads via
    // `eventClientId`.
    const { realtorId: _drop, ...base } = event ?? { id: `ev_${Date.now()}` };
    void _drop;
    const merged: CalEvent = {
      ...base,
      title,
      address: form.address.trim(),
      unit: form.unit.trim(),
      date: form.date,
      start: form.start || undefined,
      contactName: form.contactName.trim(),
      clientId: form.clientId || undefined,
      status: form.status,
      // Preserve any color the event already carried (legacy manual
      // picks still render via `eventColor` fallback for client-less
      // events) without exposing a picker in the UI.
      ...(event?.color ? { color: event.color } : {}),
      notes: form.notes.trim(),
      ...( {
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
      } as Partial<CalEvent>),
    };
    onSave(merged);
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (!event || !onDelete) return;
    setConfirmDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!event || !onDelete) return;
    onDelete(event.id);
    setConfirmDeleteOpen(false);
    onOpenChange(false);
  };

  const activeClients = clients.filter((c) => (c.name || c.company)?.trim());

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>
            {event
              ? "Update the details for this shoot."
              : "Add a new shoot to your calendar."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-address">Address</Label>
            <AddressAutocomplete
              id="ev-address"
              autoFocus
              value={form.address}
              onChange={(v) => setForm((f) => ({ ...f, address: v }))}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-unit">Unit</Label>
              <Input
                id="ev-unit"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
                }
                placeholder="301"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input
                id="ev-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="ev-start">Time</Label>
              <Input
                id="ev-start"
                type="time"
                value={form.start}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start: e.target.value }))
                }
              />
            </div>
          </div>

          <fieldset className="rounded-md border p-3">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Seller / tenant contact
            </legend>
            <div className="flex flex-col gap-3">
              <Input
                aria-label="Contact name"
                placeholder="Name"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="Contact phone"
                  placeholder="Phone"
                  type="tel"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                />
                <Input
                  aria-label="Contact email"
                  placeholder="Email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactEmail: e.target.value }))
                  }
                />
              </div>
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="ev-client">Client</Label>
              <Select
                value={form.clientId || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, clientId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger id="ev-client" className="w-full">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {activeClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name || c.company}
                      {c.name && c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-w-0 flex-col gap-2">
              <Label htmlFor="ev-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as EventStatus }))
                }
              >
                <SelectTrigger id="ev-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>


          <div className="flex flex-col gap-2">
            <Label htmlFor="ev-notes">Notes</Label>
            <Textarea
              id="ev-notes"
              rows={3}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Access codes, gate info, etc."
            />
          </div>

          {/* Deliverables — only for saved events so uploads are tied to a
              stable eventId. For brand-new events we show a hint and
              surface the section once the event is saved. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Deliverables</Label>
              {event && event.files?.length ? (
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {event.files.length}
                  {event.files.length === 1 ? " file" : " files"}
                </span>
              ) : null}
            </div>
            {event && user ? (
              <EventFiles
                uid={user.uid}
                eventId={event.id}
                files={event.files ?? []}
                onChange={(next) => {
                  // Persist immediately so uploads survive cancels. The
                  // rest of the form still saves via the Save button.
                  onSave({ ...event, files: next });
                }}
              />
            ) : (
              <p className="rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground">
                Save the event first, then reopen it to attach photos
                and videos for the client.
              </p>
            )}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <DialogFooter className="sm:justify-between">
          <div>
            {event && onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>{event ? "Save" : "Add event"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmDialog
      open={confirmDeleteOpen}
      onOpenChange={setConfirmDeleteOpen}
      title="Delete this event?"
      description="This permanently removes it from your calendar. This action cannot be undone."
      confirmLabel="Delete"
      destructive
      onConfirm={confirmDelete}
    />
    </>
  );
}
