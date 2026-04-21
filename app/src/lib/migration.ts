/**
 * One-shot migration: merges the legacy `realtors/` list into `clients/`,
 * rewrites `calEvents[*].realtorId` → `clientId`, and removes `realtors/`.
 *
 * Exposed on `window.lumeriaMigrate` in development so it can be run from the
 * browser console against the live database by the signed-in user.
 *
 * Matching rule: realtor ↔ client pairs are detected by case-insensitive
 * email equality. When a match is found, the resulting record keeps the
 * REALTOR's id (because calendar events and existing public share tokens key
 * on that id) and carries over the client's pricing `overrides` + `discount`.
 * Any invoices that referenced the client's now-discarded id are rewritten to
 * point at the realtor id.
 */
import { db, ref, get, set, remove } from "@/lib/firebase";
import type {
  CalEvent,
  Client,
  ClientDiscount,
  ClientOverrides,
  Invoice,
} from "@/lib/types";

type LegacyRealtor = {
  id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

type LegacyClient = {
  id: string;
  name?: string;
  company?: string;
  email?: string;
  overrides?: ClientOverrides;
  discount?: ClientDiscount;
};

interface MigrationPlan {
  uid: string;
  clientsBefore: number;
  realtorsBefore: number;
  mergedPairs: { realtorId: string; clientId: string; email: string }[];
  standaloneRealtors: number;
  standaloneClients: number;
  clientsAfter: Client[];
  invoiceRewrites: number;
  eventsRewrites: number;
  nextInvoices: Invoice[];
  nextEvents: CalEvent[];
}

function readArray<T>(snapVal: unknown): T[] {
  if (!snapVal) return [];
  if (Array.isArray(snapVal)) return snapVal.filter(Boolean) as T[];
  if (typeof snapVal === "object")
    return Object.values(snapVal as Record<string, T>).filter(Boolean) as T[];
  return [];
}

async function loadState(uid: string) {
  const base = `users/${uid}`;
  const [clientsSnap, realtorsSnap, invoicesSnap, eventsSnap] =
    await Promise.all([
      get(ref(db, `${base}/clients`)),
      get(ref(db, `${base}/realtors`)),
      get(ref(db, `${base}/invoices`)),
      get(ref(db, `${base}/calEvents`)),
    ]);
  return {
    clients: readArray<LegacyClient>(clientsSnap.val()),
    realtors: readArray<LegacyRealtor>(realtorsSnap.val()),
    invoices: readArray<Invoice>(invoicesSnap.val()),
    events: readArray<CalEvent>(eventsSnap.val()),
  };
}

function buildPlan(
  uid: string,
  clients: LegacyClient[],
  realtors: LegacyRealtor[],
  invoices: Invoice[],
  events: CalEvent[]
): MigrationPlan {
  // Index clients by normalized email for O(1) merge lookup. Clients without
  // an email are kept as-is (they can't be matched automatically).
  const clientsByEmail = new Map<string, LegacyClient>();
  for (const c of clients) {
    const e = c.email?.trim().toLowerCase();
    if (e) clientsByEmail.set(e, c);
  }

  const mergedPairs: MigrationPlan["mergedPairs"] = [];
  const idRewrites = new Map<string, string>(); // oldClientId → realtorId
  const byIdAfter = new Map<string, Client>();

  // Start with all existing clients. Those that get merged will have their
  // entries replaced below; those without a realtor match survive unchanged.
  for (const c of clients) {
    byIdAfter.set(c.id, { ...c });
  }

  // Merge each realtor into the email-matched client (if any), else as a
  // new standalone client. Realtor id always wins so that calEvents and
  // existing share tokens remain valid.
  for (const r of realtors) {
    const email = r.email?.trim().toLowerCase();
    const match = email ? clientsByEmail.get(email) : undefined;
    if (match) {
      // Remove the old client entry and re-insert under the realtor id
      byIdAfter.delete(match.id);
      idRewrites.set(match.id, r.id);
      const merged: Client = {
        id: r.id,
        name: r.name || match.name || "",
        company: r.company || match.company || "",
        email: match.email || r.email || "",
        phone: r.phone || "",
        notes: r.notes || "",
        ...(match.overrides ? { overrides: match.overrides } : {}),
        ...(match.discount ? { discount: match.discount } : {}),
      };
      byIdAfter.set(r.id, merged);
      mergedPairs.push({
        realtorId: r.id,
        clientId: match.id,
        email: email ?? "",
      });
    } else {
      // No email match — keep the realtor as a new standalone client.
      byIdAfter.set(r.id, {
        id: r.id,
        name: r.name || "",
        company: r.company || "",
        email: r.email || "",
        phone: r.phone || "",
        notes: r.notes || "",
      });
    }
  }

  // Rewrite any invoice pointing at a merged-away client id.
  let invoiceRewrites = 0;
  const nextInvoices: Invoice[] = invoices.map((inv) => {
    if (inv.clientId && idRewrites.has(inv.clientId)) {
      invoiceRewrites++;
      return { ...inv, clientId: idRewrites.get(inv.clientId) };
    }
    return inv;
  });

  // Flip `realtorId` → `clientId` on every event; strip the legacy field.
  let eventsRewrites = 0;
  const nextEvents: CalEvent[] = events.map((ev) => {
    if (ev.realtorId && !ev.clientId) {
      eventsRewrites++;
      const { realtorId: _, ...rest } = ev;
      void _;
      return { ...rest, clientId: ev.realtorId };
    }
    return ev;
  });

  const standaloneRealtors = realtors.length - mergedPairs.length;
  const standaloneClients =
    clients.length - mergedPairs.length; // unmatched clients survive unchanged

  return {
    uid,
    clientsBefore: clients.length,
    realtorsBefore: realtors.length,
    mergedPairs,
    standaloneRealtors,
    standaloneClients,
    clientsAfter: Array.from(byIdAfter.values()),
    invoiceRewrites,
    eventsRewrites,
    nextInvoices,
    nextEvents,
  };
}

function summarize(plan: MigrationPlan): void {
  console.groupCollapsed(
    `[lumeria migration] uid=${plan.uid} — dry-run summary`
  );
  console.log(
    `Before: ${plan.clientsBefore} clients, ${plan.realtorsBefore} realtors`
  );
  console.log(
    `After:  ${plan.clientsAfter.length} clients (merged ${plan.mergedPairs.length}, ${plan.standaloneRealtors} realtor-only, ${plan.standaloneClients} client-only kept)`
  );
  console.log(
    `Invoice clientId rewrites: ${plan.invoiceRewrites} / ${plan.nextInvoices.length}`
  );
  console.log(
    `Event realtorId → clientId: ${plan.eventsRewrites} / ${plan.nextEvents.length}`
  );
  if (plan.mergedPairs.length) {
    console.table(plan.mergedPairs);
  }
  console.log("Result preview →", plan);
  console.groupEnd();
}

/** Run the migration without writing anything. Returns the full plan. */
export async function previewMigration(uid: string): Promise<MigrationPlan> {
  const { clients, realtors, invoices, events } = await loadState(uid);
  const plan = buildPlan(uid, clients, realtors, invoices, events);
  summarize(plan);
  return plan;
}

/**
 * Run the migration against Firebase. Writes `clients/`, rewrites `invoices/`
 * and `calEvents/` as needed, and removes `realtors/`. Idempotent: running a
 * second time is a no-op once `realtors/` is empty.
 */
export async function commitMigration(uid: string): Promise<MigrationPlan> {
  const plan = await previewMigration(uid);
  const base = `users/${uid}`;

  await set(ref(db, `${base}/clients`), plan.clientsAfter);
  if (plan.invoiceRewrites > 0) {
    await set(ref(db, `${base}/invoices`), plan.nextInvoices);
  }
  if (plan.eventsRewrites > 0) {
    await set(ref(db, `${base}/calEvents`), plan.nextEvents);
  }
  await remove(ref(db, `${base}/realtors`));

  console.log("[lumeria migration] committed", plan);
  return plan;
}

declare global {
  interface Window {
    lumeriaMigrate?: {
      preview: (uid: string) => Promise<MigrationPlan>;
      commit: (uid: string) => Promise<MigrationPlan>;
    };
  }
}

// Expose on window for console-driven migration. Safe to mount unconditionally
// — it requires a uid argument and still flows through the authed Firebase
// connection.
if (typeof window !== "undefined") {
  window.lumeriaMigrate = {
    preview: previewMigration,
    commit: commitMigration,
  };
}
