import { ref, set, db } from "@/lib/firebase";
import {
  eventClientId,
  type CalEvent,
  type Client,
  type Config,
  type EventFile,
} from "@/lib/types";
import {
  DEFAULT_ADDONS,
  DEFAULT_PACKAGES,
  computeDiscountAmount,
  resolveAddons,
  resolvePackages,
} from "@/lib/invoice";

/** Public, download-only slice of an EventFile — just what the share
 *  page needs to render download buttons. */
export interface SharedFile {
  id: string;
  name: string;
  kind: "photo" | "video" | "other";
  original: { url: string; size: number };
  compressed?: { url: string; size: number };
}

export interface SharedEvent {
  title?: string;
  address?: string;
  unit?: string;
  date: string;
  start?: string;
  color?: string;
  notes?: string;
  status: string;
  files?: SharedFile[];
}

/** Client-facing pricing snapshot that lives alongside the events. */
export interface SharedPricing {
  packages: { id: string; name: string; price: number; extraLabel?: string; extraPrice?: number }[];
  addons: { id: string; name: string; price: number; qty?: boolean }[];
  discount?: { type: "%" | "$"; value: number; label: string };
}

export interface SharedData {
  /** Display name of the client this share belongs to. */
  realtorName: string;
  /** Display company. Kept as `realtorCompany` on the wire for legacy
   *  compatibility with existing `shared/<token>` entries already in Firebase
   *  and with the public viewer URL. */
  realtorCompany: string;
  events: SharedEvent[];
  /** Present when the photographer has published a pricing snapshot —
   *  client-side sees their own resolved prices + any discount. */
  pricing?: SharedPricing;
}

/**
 * Share tokens are `base64(uid::clientId)` with padding stripped. The format
 * is unchanged from the legacy realtor-scoped build, so any existing public
 * share links remain valid after the realtor → client unification.
 */
export function clientShareToken(uid: string, clientId: string): string {
  return btoa(`${uid}::${clientId}`).replace(/=/g, "");
}

export function clientShareLink(uid: string, clientId: string): string {
  const token = clientShareToken(uid, clientId);
  const origin = window.location.origin;
  return `${origin}/shared?share=${token}`;
}

function fileToShared(f: EventFile): SharedFile {
  const out: SharedFile = {
    id: f.id,
    name: f.name,
    kind: f.kind,
    original: { url: f.original.url, size: f.original.size },
  };
  if (f.compressed) {
    out.compressed = { url: f.compressed.url, size: f.compressed.size };
  }
  return out;
}

function eventToShared(ev: CalEvent): SharedEvent {
  // Caller guarantees a date (syncSharedData filters dateless events
  // out) but we default to empty string defensively in case of
  // unexpected upstream data.
  //
  // Critical: Firebase's `set()` rejects ANY `undefined` value in the
  // payload (entire write fails, not just the field). Only copy
  // optional fields when they're actually populated so we never send
  // `color: undefined` and friends down the wire.
  const shared: SharedEvent = {
    date: ev.date ?? "",
    status: ev.status || "scheduled",
  };
  if (ev.title) shared.title = ev.title;
  if (ev.address) shared.address = ev.address;
  if (ev.unit) shared.unit = ev.unit;
  if (ev.start) shared.start = ev.start;
  if (ev.color) shared.color = ev.color;
  if (ev.notes) shared.notes = ev.notes;
  if (ev.files?.length) {
    shared.files = ev.files.map(fileToShared);
  }
  return shared;
}

/**
 * Build the per-client pricing snapshot using the photographer's active
 * config and the client's per-client overrides / discount. Mirrors
 * what the invoice editor applies at send time so the share page shows
 * exactly what the client will end up paying.
 */
function buildClientPricing(
  config: Config,
  client: Client
): SharedPricing {
  const basePackages = config.packages?.length ? config.packages : DEFAULT_PACKAGES;
  const baseAddons = config.addons?.length ? config.addons : DEFAULT_ADDONS;
  // Only attach optional fields when they're actually populated —
  // Firebase's set() validation rejects any `undefined` anywhere in
  // the payload and fails the whole write.
  const packages = resolvePackages(basePackages, client).map((p) => {
    const out: SharedPricing["packages"][number] = {
      id: p.id,
      name: p.name,
      price: p.price,
    };
    if (p.extraLabel) out.extraLabel = p.extraLabel;
    if (typeof p.extraPrice === "number") out.extraPrice = p.extraPrice;
    return out;
  });
  const addons = resolveAddons(baseAddons, client).map((a) => {
    const out: SharedPricing["addons"][number] = {
      id: a.id,
      name: a.name,
      price: a.price,
    };
    if (typeof a.qty === "boolean") out.qty = a.qty;
    return out;
  });
  const out: SharedPricing = { packages, addons };
  if (client.discount?.value && client.discount.value > 0) {
    const sample = 100; // we just use it for label formatting
    const amount = computeDiscountAmount(sample, client.discount);
    out.discount = {
      type: client.discount.type,
      value: client.discount.value,
      label:
        client.discount.type === "%"
          ? `${client.discount.value}% off`
          : `$${amount.toFixed(2)} off`,
    };
  }
  return out;
}

/**
 * Mirrors calendar events for each client into `shared/<token>` so the public
 * status page can read them without auth. Also stamps a per-client pricing
 * snapshot so the share page can surface a "Your pricing" tab.
 */
export function syncSharedData(
  uid: string,
  clients: Client[],
  calEvents: CalEvent[],
  config: Config
): void {
  if (!uid) return;
  const byClient = new Map<string, SharedEvent[]>();
  for (const ev of calEvents) {
    const cid = eventClientId(ev);
    if (!cid) continue;
    // Skip events without a committed date — they're on the
    // photographer's "to schedule" list, not yet something clients
    // should see on their public status page.
    if (!ev.date) continue;
    const list = byClient.get(cid) ?? [];
    list.push(eventToShared(ev));
    byClient.set(cid, list);
  }
  for (const c of clients) {
    const token = clientShareToken(uid, c.id);
    const payload: SharedData = {
      realtorName: c.name || c.company || "",
      realtorCompany: c.company || "",
      events: byClient.get(c.id) ?? [],
      pricing: buildClientPricing(config, c),
    };
    // Fire-and-forget by design, but we MUST catch so a validation
    // failure on any one client doesn't bubble up as an unhandled
    // promise rejection and — under React 19's stricter default error
    // policy — unmount the whole app.
    set(ref(db, `shared/${token}`), payload).catch((err) => {
      /* eslint-disable-next-line no-console */
      console.warn("[lumeria shared sync] skipped:", c.id, err?.message ?? err);
    });
  }
}
