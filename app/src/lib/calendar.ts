import { eventClientId, type CalEvent, type Client } from "@/lib/types";
import { todayISO } from "@/lib/format";

export type EventColor =
  | "blue"
  | "purple"
  | "green"
  | "amber"
  | "pink"
  | "teal"
  | "rose"
  | "indigo";

export const EVENT_COLORS: EventColor[] = [
  "blue",
  "purple",
  "green",
  "amber",
  "pink",
  "teal",
  "rose",
  "indigo",
];

export const COLOR_DOT: Record<EventColor, string> = {
  blue: "#7cadf0",
  purple: "#a78bfa",
  green: "#6dd4a8",
  amber: "#f5c96b",
  pink: "#f0a0c4",
  teal: "#5ec5c0",
  rose: "#f4877f",
  indigo: "#818cf8",
};

// Soft chip backgrounds + text for light/dark, applied via inline style so we
// don't need to generate dozens of Tailwind color classes.
export const COLOR_CHIP_LIGHT: Record<EventColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(124,173,240,0.16)", fg: "#3574c4" },
  purple: { bg: "rgba(167,139,250,0.16)", fg: "#7c3aed" },
  green: { bg: "rgba(109,212,168,0.16)", fg: "#0e9a6e" },
  amber: { bg: "rgba(245,201,107,0.16)", fg: "#a5710a" },
  pink: { bg: "rgba(240,160,196,0.16)", fg: "#c4477a" },
  teal: { bg: "rgba(94,197,192,0.16)", fg: "#0d8a85" },
  rose: { bg: "rgba(244,135,127,0.16)", fg: "#c9403a" },
  indigo: { bg: "rgba(129,140,248,0.16)", fg: "#5558d6" },
};

export const COLOR_CHIP_DARK: Record<EventColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(124,173,240,0.22)", fg: "#a8c8f5" },
  purple: { bg: "rgba(167,139,250,0.22)", fg: "#c4b1fb" },
  green: { bg: "rgba(109,212,168,0.22)", fg: "#9be3c3" },
  amber: { bg: "rgba(245,201,107,0.22)", fg: "#f4d58e" },
  pink: { bg: "rgba(240,160,196,0.22)", fg: "#f5bcd5" },
  teal: { bg: "rgba(94,197,192,0.22)", fg: "#9ad9d6" },
  rose: { bg: "rgba(244,135,127,0.22)", fg: "#f5ada7" },
  indigo: { bg: "rgba(129,140,248,0.22)", fg: "#adb3f7" },
};

/**
 * Deterministic color for a given client id. The id is hashed into the
 * existing event-color palette so the assignment is stable across
 * sessions, devices, and reloads — no field to store, nothing to
 * migrate, and every event for the same client picks up the same hue.
 */
export function clientColor(client: Client | null | undefined): EventColor {
  const id = client?.id;
  if (!id) return "blue";
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return EVENT_COLORS[Math.abs(hash) % EVENT_COLORS.length];
}

/**
 * Resolve the display color for an event. When the event has a client
 * and the clients map carries them, the client's auto-assigned color
 * wins — this keeps every event for the same client visually uniform
 * across the calendar, agenda, board, and dashboard. Events without a
 * client fall back to their own `color` field, and then to "blue".
 */
export function eventColor(
  ev: CalEvent,
  clientsById?: Map<string, Client> | null
): EventColor {
  const cid = eventClientId(ev);
  if (cid && clientsById) {
    const client = clientsById.get(cid);
    if (client) return clientColor(client);
  }
  const c = (ev.color as EventColor) || "blue";
  return EVENT_COLORS.includes(c) ? c : "blue";
}

export type EventStatus =
  | "received"
  | "pending"
  | "scheduled"
  | "shooting"
  | "editing"
  | "delivered";

export const STATUS_ORDER: EventStatus[] = [
  "received",
  "pending",
  "scheduled",
  "shooting",
  "editing",
  "delivered",
];

export const STATUS_META: Record<EventStatus, { label: string; dot: string }> = {
  received: { label: "Received", dot: "#9e9ea7" },
  pending: { label: "Pending", dot: "#f0a0c4" },
  scheduled: { label: "Scheduled", dot: "#7cadf0" },
  shooting: { label: "Shooting", dot: "#f5c96b" },
  editing: { label: "Editing", dot: "#a78bfa" },
  delivered: { label: "Delivered", dot: "#6dd4a8" },
};

export function normalizeStatus(status?: string): EventStatus {
  if (status && STATUS_ORDER.includes(status as EventStatus)) {
    return status as EventStatus;
  }
  return "scheduled";
}

// --- Date helpers ---
export function parseISODate(iso: string): Date {
  // "YYYY-MM-DD" parsed as local midnight (Date constructor with parts)
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function getWeekStart(d: Date): Date {
  // Sunday-based week
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() - out.getDay());
  return out;
}

export function getMonthGrid(year: number, month: number): Date[] {
  // Always 6 rows × 7 cols, starting on Sunday
  const first = new Date(year, month, 1);
  const start = getWeekStart(first);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(addDays(start, i));
  return cells;
}

export function minutesFromHHMM(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function compareEvents(a: CalEvent, b: CalEvent): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const as = a.start ?? "";
  const bs = b.start ?? "";
  if (as === bs) return 0;
  if (!as) return -1;
  if (!bs) return 1;
  return as < bs ? -1 : 1;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
