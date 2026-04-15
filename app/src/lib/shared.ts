import { ref, set, db } from "@/lib/firebase";
import { eventClientId, type CalEvent, type Client } from "@/lib/types";

export interface SharedEvent {
  title?: string;
  address?: string;
  unit?: string;
  date: string;
  start?: string;
  color?: string;
  notes?: string;
  status: string;
}

export interface SharedData {
  /** Display name of the client this share belongs to. */
  realtorName: string;
  /** Display company. Kept as `realtorCompany` on the wire for legacy
   *  compatibility with existing `shared/<token>` entries already in Firebase
   *  and with the public viewer URL. */
  realtorCompany: string;
  events: SharedEvent[];
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

function eventToShared(ev: CalEvent): SharedEvent {
  return {
    title: ev.title,
    address: ev.address,
    unit: ev.unit,
    date: ev.date,
    start: ev.start,
    color: ev.color,
    notes: ev.notes,
    status: ev.status || "scheduled",
  };
}

/**
 * Mirrors calendar events for each client into `shared/<token>` so the public
 * status page can read them without auth.
 */
export function syncSharedData(
  uid: string,
  clients: Client[],
  calEvents: CalEvent[]
): void {
  if (!uid) return;
  const byClient = new Map<string, SharedEvent[]>();
  for (const ev of calEvents) {
    const cid = eventClientId(ev);
    if (!cid) continue;
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
    };
    void set(ref(db, `shared/${token}`), payload);
  }
}
