import { ref, set, db } from "@/lib/firebase";
import type { CalEvent, Realtor } from "@/lib/types";

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
  realtorName: string;
  realtorCompany: string;
  events: SharedEvent[];
}

export function realtorShareToken(uid: string, realtorId: string): string {
  // Legacy format: base64(uid::realtorId) with '=' padding stripped
  return btoa(`${uid}::${realtorId}`).replace(/=/g, "");
}

export function realtorShareLink(uid: string, realtorId: string): string {
  const token = realtorShareToken(uid, realtorId);
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
 * Mirrors the calendar events for each realtor into `shared/<token>` so the
 * public status page can read them without auth. Matches the legacy
 * index.html `syncSharedData` shape so existing share links keep working.
 */
export function syncSharedData(
  uid: string,
  realtors: Realtor[],
  calEvents: CalEvent[]
): void {
  if (!uid) return;
  const byRealtor = new Map<string, SharedEvent[]>();
  for (const ev of calEvents) {
    if (!ev.realtorId) continue;
    const list = byRealtor.get(ev.realtorId) ?? [];
    list.push(eventToShared(ev));
    byRealtor.set(ev.realtorId, list);
  }
  for (const r of realtors) {
    const token = realtorShareToken(uid, r.id);
    const payload: SharedData = {
      realtorName: r.name || "",
      realtorCompany: r.company || "",
      events: byRealtor.get(r.id) ?? [],
    };
    void set(ref(db, `shared/${token}`), payload);
  }
}
