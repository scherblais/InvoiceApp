import { functions, httpsCallable } from "@/lib/firebase";
import type { CalEvent, Client, Config, ConfigBookingEmail } from "@/lib/types";
import {
  buildVariables,
  getEffectiveTemplate,
  renderTemplate,
  sampleVariables,
  type BookingEmailVariables,
} from "@/lib/booking-email";

interface SendBookingConfirmationInput {
  eventId: string;
  clientEmail: string;
  subject?: string;
  text?: string;
  fromName?: string;
  clientName?: string;
  address?: string;
  unit?: string;
  date?: string;
  start?: string;
  notes?: string;
  photographerName?: string;
  photographerEmail?: string;
}

interface SendBookingConfirmationResult {
  id: string | null;
}

const callable = httpsCallable<
  SendBookingConfirmationInput,
  SendBookingConfirmationResult
>(functions, "sendBookingConfirmation");

function renderEmail(
  config: Config,
  vars: BookingEmailVariables
): { subject: string; text: string; fromName: string } {
  const tpl = getEffectiveTemplate(config);
  return {
    subject: renderTemplate(tpl.subject, vars),
    text: renderTemplate(tpl.body, vars),
    fromName: tpl.fromName,
  };
}

/**
 * Dispatch the booking-confirmation email for a calendar event. Assumes the
 * caller has already verified the event is in a confirmable state (has date,
 * clientId, and a client with an email). The Cloud Function authenticates via
 * the signed-in Firebase user; no token plumbing required here.
 */
export async function sendBookingConfirmationEmail(
  ev: CalEvent,
  client: Client,
  config: Config
): Promise<SendBookingConfirmationResult> {
  if (!ev.date) throw new Error("Event has no date");
  if (!client.email) throw new Error("Client has no email on file");
  const vars = buildVariables(ev, client, config);
  const rendered = renderEmail(config, vars);
  const payload: SendBookingConfirmationInput = {
    eventId: ev.id,
    clientEmail: client.email,
    subject: rendered.subject,
    text: rendered.text,
    fromName: rendered.fromName || undefined,
    clientName: vars.clientName,
    address: vars.address,
    unit: vars.unit || undefined,
    date: ev.date,
    start: ev.start || undefined,
    notes: vars.notes || undefined,
    photographerName: vars.photographerName,
    photographerEmail: vars.photographerEmail || undefined,
  };
  const { data } = await callable(payload);
  return data;
}

/**
 * Send a preview of the (possibly unsaved) template to the given recipient,
 * using the sample variables from the settings preview. Lets the photographer
 * iterate on copy without scheduling fake events.
 */
export async function sendTestBookingEmail(
  recipientEmail: string,
  draft: ConfigBookingEmail,
  config: Config
): Promise<SendBookingConfirmationResult> {
  if (!recipientEmail.trim()) throw new Error("Recipient email is required");
  const vars = sampleVariables(config);
  const draftConfig: Config = { ...config, bookingEmail: draft };
  const rendered = renderEmail(draftConfig, vars);
  const payload: SendBookingConfirmationInput = {
    eventId: `test_${Date.now()}`,
    clientEmail: recipientEmail.trim(),
    subject: rendered.subject,
    text: rendered.text,
    fromName: rendered.fromName || undefined,
    photographerEmail: vars.photographerEmail || undefined,
  };
  const { data } = await callable(payload);
  return data;
}
