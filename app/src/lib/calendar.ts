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

/**
 * Pop-pastel palette. Hues kept, chroma pushed so the dots and chips
 * read vividly against both white and the new pure-black dark mode
 * without tipping into neon. Values align with Tailwind's 500-level
 * so the chip backgrounds / foregrounds below can reuse Tailwind's
 * surrounding shades without retuning by eye.
 */
export const COLOR_DOT: Record<EventColor, string> = {
  blue: "#3b82f6",    // blue-500
  purple: "#a855f7",  // purple-500
  green: "#10b981",   // emerald-500
  amber: "#f59e0b",   // amber-500
  pink: "#ec4899",    // pink-500
  teal: "#14b8a6",    // teal-500
  rose: "#f43f5e",    // rose-500
  indigo: "#6366f1",  // indigo-500
};

/**
 * Chip backgrounds + foregrounds for light / dark. Backgrounds are the
 * COLOR_DOT hue at 15 / 22% alpha (enough tint to read as colored,
 * not so much that it competes with the card). Foregrounds are
 * Tailwind's 700-level in light mode and 300-level in dark so text
 * stays comfortably readable at 11–12px.
 */
export const COLOR_CHIP_LIGHT: Record<EventColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(59,130,246,0.15)", fg: "#1d4ed8" },    // blue-700
  purple: { bg: "rgba(168,85,247,0.15)", fg: "#7e22ce" },  // purple-700
  green: { bg: "rgba(16,185,129,0.15)", fg: "#047857" },   // emerald-700
  amber: { bg: "rgba(245,158,11,0.18)", fg: "#b45309" },   // amber-700
  pink: { bg: "rgba(236,72,153,0.15)", fg: "#be185d" },    // pink-700
  teal: { bg: "rgba(20,184,166,0.15)", fg: "#0f766e" },    // teal-700
  rose: { bg: "rgba(244,63,94,0.15)", fg: "#be123c" },     // rose-700
  indigo: { bg: "rgba(99,102,241,0.15)", fg: "#4338ca" },  // indigo-700
};

export const COLOR_CHIP_DARK: Record<EventColor, { bg: string; fg: string }> = {
  blue: { bg: "rgba(59,130,246,0.22)", fg: "#93c5fd" },    // blue-300
  purple: { bg: "rgba(168,85,247,0.22)", fg: "#d8b4fe" },  // purple-300
  green: { bg: "rgba(16,185,129,0.22)", fg: "#6ee7b7" },   // emerald-300
  amber: { bg: "rgba(245,158,11,0.25)", fg: "#fcd34d" },   // amber-300
  pink: { bg: "rgba(236,72,153,0.22)", fg: "#f9a8d4" },    // pink-300
  teal: { bg: "rgba(20,184,166,0.22)", fg: "#5eead4" },    // teal-300
  rose: { bg: "rgba(244,63,94,0.22)", fg: "#fda4af" },     // rose-300
  indigo: { bg: "rgba(99,102,241,0.22)", fg: "#a5b4fc" },  // indigo-300
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
  | "delivered";

export const STATUS_ORDER: EventStatus[] = [
  "received",
  "pending",
  "scheduled",
  "delivered",
];

export const STATUS_META: Record<EventStatus, { label: string; dot: string }> = {
  received: { label: "Received", dot: "#94a3b8" },   // slate-400
  pending: { label: "Pending", dot: "#ec4899" },     // pink-500
  scheduled: { label: "Scheduled", dot: "#3b82f6" }, // blue-500
  delivered: { label: "Delivered", dot: "#10b981" }, // emerald-500
};

/**
 * Pastel chip backgrounds + readable foregrounds per status. Same
 * 15/22% alpha + 700/300-level text formula as COLOR_CHIP_* so
 * status-tinted surfaces (kanban cards, status pills) blend into
 * the rest of the UI's tonal language.
 */
export const STATUS_CHIP_LIGHT: Record<EventStatus, { bg: string; fg: string }> = {
  received: { bg: "rgba(148,163,184,0.18)", fg: "#334155" },  // slate-700
  pending: { bg: "rgba(236,72,153,0.15)", fg: "#be185d" },    // pink-700
  scheduled: { bg: "rgba(59,130,246,0.15)", fg: "#1d4ed8" },  // blue-700
  delivered: { bg: "rgba(16,185,129,0.15)", fg: "#047857" },  // emerald-700
};

export const STATUS_CHIP_DARK: Record<EventStatus, { bg: string; fg: string }> = {
  received: { bg: "rgba(148,163,184,0.18)", fg: "#cbd5e1" },  // slate-300
  pending: { bg: "rgba(236,72,153,0.22)", fg: "#f9a8d4" },    // pink-300
  scheduled: { bg: "rgba(59,130,246,0.22)", fg: "#93c5fd" },  // blue-300
  delivered: { bg: "rgba(16,185,129,0.22)", fg: "#6ee7b7" },  // emerald-300
};

export function normalizeStatus(status?: string): EventStatus {
  if (status && STATUS_ORDER.includes(status as EventStatus)) {
    return status as EventStatus;
  }
  // Legacy "shooting" and "editing" values collapse to "scheduled" —
  // the workflow simplified so these intermediate statuses no longer
  // appear in the picker. Existing events silently fold to the active
  // bucket on their next read.
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
  const ad = a.date ?? "";
  const bd = b.date ?? "";
  if (ad !== bd) return ad < bd ? -1 : 1;
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
