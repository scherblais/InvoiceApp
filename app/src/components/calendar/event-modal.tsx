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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COLOR_DOT,
  EVENT_COLORS,
  STATUS_ORDER,
  STATUS_META,
  normalizeStatus,
  type EventColor,
  type EventStatus,
} from "@/lib/calendar";
import { eventClientId, type CalEvent, type Client } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  color: EventColor;
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
    color: "blue",
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
    color: (EVENT_COLORS.includes((ev.color ?? "") as EventColor)
      ? ev.color
      : "blue") as EventColor,
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
  const [form, setForm] = useState<FormState>(() =>
    event ? eventToForm(event) : emptyForm(defaultDate ?? "", defaultTime)
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
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
      color: form.color,
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
    if (window.confirm("Delete this event?")) {
      onDelete(event.id);
      onOpenChange(false);
    }
  };

  const activeClients = clients.filter((c) => (c.name || c.company)?.trim());

  return (
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
            <Input
              id="ev-address"
              autoFocus
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
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

          <div className="rounded-md border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Seller / tenant contact
            </div>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="Name"
                value={form.contactName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contactName: e.target.value }))
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Phone"
                  value={form.contactPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactPhone: e.target.value }))
                  }
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contactEmail: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Client</Label>
              <Select
                value={form.clientId || "none"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, clientId: v === "none" ? "" : v }))
                }
              >
                <SelectTrigger>
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
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, status: v as EventStatus }))
                }
              >
                <SelectTrigger>
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
            <Label>Color</Label>
            <div className="flex gap-1.5">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color: c }))}
                  style={{ backgroundColor: COLOR_DOT[c] }}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    form.color === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  )}
                  aria-label={c}
                />
              ))}
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
  );
}
