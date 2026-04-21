import type { CalEvent, Client, Config } from "@/lib/types";
import { formatTime12 } from "@/lib/format";

/**
 * User-editable booking-confirmation template, persisted on the photographer's
 * `Config` record. All fields are optional — anything blank falls back to the
 * built-in defaults below so the feature works even before the user touches
 * the Notifications settings page.
 */
export interface BookingEmailConfig {
  /** Master switch — when false, no booking emails are sent. */
  enabled?: boolean;
  /** Display name used in the From header (e.g. "Lumeria Media"). */
  fromName?: string;
  /** Subject line. Supports the same placeholders as the body. */
  subject?: string;
  /** Body template. Plain text; rendered as preformatted HTML in the email. */
  body?: string;
}

export const DEFAULT_SUBJECT = "Shoot booked — {fullAddress}";
export const DEFAULT_BODY = `Hi {clientName},

Your shoot is booked for {date}{timeSuffix} — {fullAddress}.{notesBlock}

Reply to this email if anything changes.

— {photographerName}`;

export interface BookingEmailVariables {
  clientName: string;
  clientCompany: string;
  date: string;
  time: string;
  /** "" or " at 2 PM" — handy for keeping templates clean when time is blank. */
  timeSuffix: string;
  address: string;
  unit: string;
  /** "123 Main St" or "123 Main St, Apt 301". */
  fullAddress: string;
  notes: string;
  /** "" or "\n\n<notes>" — keeps the default template tidy when notes are blank. */
  notesBlock: string;
  photographerName: string;
  photographerEmail: string;
}

export const PLACEHOLDER_KEYS: ReadonlyArray<keyof BookingEmailVariables> = [
  "clientName",
  "clientCompany",
  "date",
  "time",
  "fullAddress",
  "address",
  "unit",
  "notes",
  "photographerName",
];

export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function buildVariables(
  ev: CalEvent,
  client: Client | null,
  config: Config
): BookingEmailVariables {
  const clientName = (client?.name || client?.company || "there").trim();
  const clientCompany = (client?.company || "").trim();
  const address = (ev.address || ev.title || "").trim();
  const unit = (ev.unit || "").trim();
  const fullAddress = unit ? `${address}, Apt ${unit}` : address;
  const dateStr = ev.date ? formatLongDate(ev.date) : "TBD";
  const timeStr = ev.start ? formatTime12(ev.start) : "";
  const timeSuffix = timeStr ? ` at ${timeStr}` : "";
  const notes = (ev.notes || "").trim();
  const notesBlock = notes ? `\n\n${notes}` : "";
  const photographerName = (config.company || "Your photographer").trim();
  const photographerEmail = (config.email || "").trim();
  return {
    clientName,
    clientCompany,
    date: dateStr,
    time: timeStr,
    timeSuffix,
    address,
    unit,
    fullAddress,
    notes,
    notesBlock,
    photographerName,
    photographerEmail,
  };
}

/**
 * Substitute `{placeholder}` tokens in the template. Unknown tokens are left
 * intact so a typo in the user's template is visible in the preview, not
 * silently swallowed.
 */
export function renderTemplate(
  template: string,
  vars: BookingEmailVariables
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    if (key in vars) {
      const value = vars[key as keyof BookingEmailVariables];
      return typeof value === "string" ? value : match;
    }
    return match;
  });
}

export function getEffectiveTemplate(config: Config): {
  subject: string;
  body: string;
  fromName: string;
} {
  const cfg = (config.bookingEmail ?? {}) as BookingEmailConfig;
  return {
    subject: cfg.subject?.trim() || DEFAULT_SUBJECT,
    body: cfg.body?.trim() || DEFAULT_BODY,
    fromName: cfg.fromName?.trim() || "",
  };
}

/** Sample data used in the live preview on the settings page. */
export function sampleVariables(config: Config): BookingEmailVariables {
  const photographerName = (config.company || "Your photographer").trim();
  const photographerEmail = (config.email || "").trim();
  return {
    clientName: "Alex Tremblay",
    clientCompany: "Royal LePage",
    date: "Friday, May 8, 2026",
    time: "2 PM",
    timeSuffix: " at 2 PM",
    address: "123 Sunset Drive",
    unit: "301",
    fullAddress: "123 Sunset Drive, Apt 301",
    notes: "Lockbox on the front gate — code 4827.",
    notesBlock: "\n\nLockbox on the front gate — code 4827.",
    photographerName,
    photographerEmail,
  };
}
