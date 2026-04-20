import type { CalEvent, Draft } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";

/**
 * Result of running the event → draft auto-link:
 *   - `drafts`: the updated drafts array (safe to pass to `saveDrafts`)
 *   - `action`: "none" | "created" | "updated" | "moved" | "removed" —
 *     drives the toast message so the user sees what just happened.
 */
export interface EventDraftLinkResult {
  drafts: Draft[];
  action: "none" | "created" | "updated" | "moved" | "removed";
  /** Month ("YYYY-MM") of the draft that was created/updated. */
  month?: string;
}

function makeDraftId(): string {
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Reconcile a calendar event with the drafts it auto-feeds. Finds any
 * existing draft line item tagged with `ev.id` and either updates,
 * moves, or removes it based on the event's current state. Appends a
 * new item (creating a draft if necessary) when the event is eligible
 * but no linked item exists yet.
 *
 * Eligibility for linking: event has a `clientId`, a `date`, and a
 * non-empty `address`. Anything less and we strip any existing link
 * without creating a new one — the event simply isn't ready to be
 * invoiced yet.
 *
 * Manual draft items (ones without an `eventId`) are never touched,
 * and existing pricing / package / travel fields on a linked item are
 * preserved across updates so the user doesn't lose work they did
 * inside the invoice editor.
 */
export function syncEventDraftLink(
  ev: CalEvent,
  drafts: Draft[]
): EventDraftLinkResult {
  const hasValidLink =
    !!ev.clientId && !!ev.date && !!ev.address?.trim();
  const month = ev.date?.slice(0, 7);

  // Find any existing linked item across ALL drafts.
  let existingDraftIdx = -1;
  let existingItemIdx = -1;
  for (let i = 0; i < drafts.length; i++) {
    const items = drafts[i].items ?? [];
    const j = items.findIndex(
      (it) => (it as InvoiceItem).eventId === ev.id
    );
    if (j >= 0) {
      existingDraftIdx = i;
      existingItemIdx = j;
      break;
    }
  }

  // Case 1: event isn't eligible to be linked anymore. Strip any
  // existing link and bail.
  if (!hasValidLink) {
    if (existingDraftIdx < 0) return { drafts, action: "none" };
    const next = drafts.map((d, i) => {
      if (i !== existingDraftIdx) return d;
      return {
        ...d,
        items: (d.items ?? []).filter((_, j) => j !== existingItemIdx),
        updatedAt: Date.now(),
      };
    });
    return { drafts: next, action: "removed" };
  }

  const targetDraftIdx = drafts.findIndex(
    (d) => d.clientId === ev.clientId && d.month === month
  );

  const addressText = ev.address!.trim();
  const unitText = ev.unit?.trim();

  // Case 2: existing link sits in the right draft → patch address/unit
  // and leave any user-entered pricing/package alone.
  if (existingDraftIdx >= 0 && existingDraftIdx === targetDraftIdx) {
    const currentItem = (drafts[existingDraftIdx].items ?? [])[
      existingItemIdx
    ] as InvoiceItem;
    const addressChanged = currentItem.address !== addressText;
    const unitChanged = (currentItem.unit ?? "") !== (unitText ?? "");
    if (!addressChanged && !unitChanged) {
      return { drafts, action: "none", month };
    }
    const next = drafts.map((d, i) => {
      if (i !== existingDraftIdx) return d;
      const items = [...(d.items ?? [])];
      const patched: InvoiceItem = {
        ...(items[existingItemIdx] as InvoiceItem),
        address: addressText,
      };
      if (unitText) {
        patched.unit = unitText;
      } else {
        delete patched.unit;
      }
      items[existingItemIdx] = patched;
      return { ...d, items, updatedAt: Date.now() };
    });
    return { drafts: next, action: "updated", month };
  }

  // Case 3: link exists in a DIFFERENT draft (client or month changed).
  // Move the item across; preserve pricing fields on the way.
  if (existingDraftIdx >= 0 && existingDraftIdx !== targetDraftIdx) {
    const carried = (drafts[existingDraftIdx].items ?? [])[
      existingItemIdx
    ] as InvoiceItem;
    const movedItem: InvoiceItem = {
      ...carried,
      address: addressText,
    };
    if (unitText) movedItem.unit = unitText;
    else delete movedItem.unit;
    const stripped = drafts.map((d, i) => {
      if (i !== existingDraftIdx) return d;
      return {
        ...d,
        items: (d.items ?? []).filter((_, j) => j !== existingItemIdx),
        updatedAt: Date.now(),
      };
    });
    if (targetDraftIdx >= 0) {
      const next = stripped.map((d, i) => {
        if (i !== targetDraftIdx) return d;
        return {
          ...d,
          items: [...(d.items ?? []), movedItem],
          updatedAt: Date.now(),
        };
      });
      return { drafts: next, action: "moved", month };
    }
    // Need a fresh draft for the new (client, month) pair.
    const created: Draft = {
      id: makeDraftId(),
      clientId: ev.clientId,
      month,
      items: [movedItem],
      savedAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { drafts: [...stripped, created], action: "moved", month };
  }

  // Case 4: no existing link → append to target or create a new draft.
  const newItem: InvoiceItem = {
    eventId: ev.id,
    address: addressText,
  };
  if (unitText) newItem.unit = unitText;

  if (targetDraftIdx >= 0) {
    const next = drafts.map((d, i) => {
      if (i !== targetDraftIdx) return d;
      return {
        ...d,
        items: [...(d.items ?? []), newItem],
        updatedAt: Date.now(),
      };
    });
    return { drafts: next, action: "updated", month };
  }
  const created: Draft = {
    id: makeDraftId(),
    clientId: ev.clientId,
    month,
    items: [newItem],
    savedAt: Date.now(),
    updatedAt: Date.now(),
  };
  return { drafts: [...drafts, created], action: "created", month };
}

/**
 * Strip any draft line items linked to `eventId`. Used when the event
 * itself is deleted — the invoice shouldn't keep billing for a shoot
 * that no longer exists.
 */
export function removeEventDraftLink(
  eventId: string,
  drafts: Draft[]
): Draft[] {
  return drafts.map((d) => {
    const items = d.items ?? [];
    const filtered = items.filter(
      (it) => (it as InvoiceItem).eventId !== eventId
    );
    if (filtered.length === items.length) return d;
    return { ...d, items: filtered, updatedAt: Date.now() };
  });
}
