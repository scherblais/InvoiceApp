import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const EMAIL_FROM = defineSecret("EMAIL_FROM");

interface SendBookingConfirmationInput {
  eventId: string;
  clientEmail: string;
  /**
   * When the caller renders the template themselves (the normal path), they
   * pass the final subject + body strings. When omitted, the function falls
   * back to the legacy hardcoded copy built from the structured fields below.
   */
  subject?: string;
  text?: string;
  /** Optional display name for the From header — e.g. "Lumeria Media". */
  fromName?: string;
  /** Legacy / fallback fields used to build the default email when no template
   * is provided. */
  clientName?: string;
  address?: string;
  unit?: string;
  date?: string;
  start?: string;
  notes?: string;
  photographerName?: string;
  photographerEmail?: string;
}

function requireString(
  value: unknown,
  field: keyof SendBookingConfirmationInput
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpsError(
      "invalid-argument",
      `Missing required field: ${String(field)}`
    );
  }
  return value.trim();
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  return date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(hhmm?: string): string {
  if (!hhmm) return "";
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${period}` : `${h12} ${period}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function textToHtml(text: string): string {
  // Preserve paragraph breaks (\n\n) and line breaks (\n) so the user's
  // formatting in the settings textarea matches what arrives in the inbox.
  const escaped = escapeHtml(text);
  const paragraphs = escaped.split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br>"));
  return paragraphs.map((p) => `<p>${p}</p>`).join("\n");
}

function buildDefaultEmail(input: SendBookingConfirmationInput): {
  subject: string;
  text: string;
} {
  const address = (input.address ?? "").trim();
  const unit = (input.unit ?? "").trim();
  const fullAddress = unit ? `${address}, Apt ${unit}` : address;
  const date = (input.date ?? "").trim();
  const start = (input.start ?? "").trim();
  const when = start
    ? `${formatDate(date)} at ${formatTime(start)}`
    : formatDate(date);
  const clientName = (input.clientName ?? "").trim();
  const notes = (input.notes ?? "").trim();
  const photographerName = (input.photographerName ?? "").trim();
  const greeting = clientName ? `Hi ${clientName},` : "Hi,";
  const signoff = photographerName
    ? `— ${photographerName}`
    : "— Your photographer";
  const lines = [greeting, "", `Your shoot is booked for ${when} — ${fullAddress}.`];
  if (notes) lines.push("", notes);
  lines.push("", "Reply to this email if anything changes.", "", signoff);
  return {
    subject: `Shoot booked — ${fullAddress}`,
    text: lines.join("\n"),
  };
}

function buildFrom(rawFrom: string, fromName: string | undefined): string {
  const name = fromName?.trim();
  if (!name) return rawFrom;
  // If the secret already has a display name (e.g. "Lumeria <…>"), strip it
  // and replace with the override so the user's settings always win.
  const angleMatch = rawFrom.match(/<([^>]+)>/);
  const bare = angleMatch ? angleMatch[1].trim() : rawFrom.trim();
  return `${name} <${bare}>`;
}

export const sendBookingConfirmation = onCall(
  { secrets: [RESEND_API_KEY, EMAIL_FROM], region: "us-central1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "Sign in is required to send confirmations."
      );
    }

    const input = (request.data ?? {}) as Partial<SendBookingConfirmationInput>;
    const eventId = requireString(input.eventId, "eventId");
    const clientEmail = requireString(input.clientEmail, "clientEmail");

    const customSubject = (input.subject ?? "").trim();
    const customText = (input.text ?? "").trim();
    const photographerEmail = (input.photographerEmail ?? "").trim();
    const fromName = input.fromName;

    let subject: string;
    let text: string;
    if (customSubject && customText) {
      subject = customSubject;
      text = customText;
    } else {
      const built = buildDefaultEmail(input as SendBookingConfirmationInput);
      subject = customSubject || built.subject;
      text = customText || built.text;
    }
    const html = textToHtml(text);

    const resend = new Resend(RESEND_API_KEY.value());
    const from = buildFrom(EMAIL_FROM.value(), fromName);
    const replyTo = photographerEmail || undefined;

    try {
      const { data, error } = await resend.emails.send({
        from,
        to: [clientEmail],
        subject,
        text,
        html,
        ...(replyTo ? { replyTo } : {}),
        headers: { "X-Event-Id": eventId },
      });
      if (error) {
        throw new HttpsError("internal", error.message ?? "Resend failed");
      }
      return { id: data?.id ?? null };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new HttpsError("internal", message);
    }
  }
);
