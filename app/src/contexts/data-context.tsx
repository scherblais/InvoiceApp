import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { useAuth } from "@/contexts/auth-context";
import { syncSharedData } from "@/lib/shared";
import { db, ref, get } from "@/lib/firebase";
import { commitMigration } from "@/lib/migration";
import { sendBookingConfirmationEmail } from "@/lib/notifications";
import { normalizeStatus } from "@/lib/calendar";
import { eventClientId } from "@/lib/types";
import type {
  Invoice,
  Draft,
  Client,
  CalEvent,
  Config,
} from "@/lib/types";

/**
 * A calendar event is "confirmable" once it has a date, an assigned client with
 * an email on file, and has left the inquiry stage (status !== "received"). A
 * booking-confirmation email is dispatched the first time an event transitions
 * into this state — see `saveCalEventsWithNotifications` below.
 */
function isConfirmable(
  ev: CalEvent,
  clientsById: Map<string, Client>
): { ok: true; client: Client } | { ok: false } {
  if (!ev.date) return { ok: false };
  if (normalizeStatus(ev.status) === "received") return { ok: false };
  const cid = eventClientId(ev);
  if (!cid) return { ok: false };
  const client = clientsById.get(cid);
  if (!client || !client.email) return { ok: false };
  return { ok: true, client };
}

interface DataContextValue {
  invoices: Invoice[];
  drafts: Draft[];
  clients: Client[];
  /**
   * Memoized lookup of clients keyed by id. Consumers use this for
   * cheap per-event color resolution without rebuilding the map on
   * every render.
   */
  clientsById: Map<string, Client>;
  calEvents: CalEvent[];
  config: Config;
  saveInvoices: (v: Invoice[]) => void;
  saveDrafts: (v: Draft[]) => void;
  saveClients: (v: Client[]) => void;
  saveCalEvents: (v: CalEvent[]) => void;
  saveConfig: (v: Config) => void;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [invoices, saveInvoices] = useFirebaseData<Invoice[]>("invoices", {
    asArray: true,
    fallback: [],
  });
  const [drafts, saveDrafts] = useFirebaseData<Draft[]>("drafts", {
    asArray: true,
    fallback: [],
  });
  const [clients, saveClients] = useFirebaseData<Client[]>("clients", {
    asArray: true,
    fallback: [],
  });
  const [calEvents, rawSaveCalEvents] = useFirebaseData<CalEvent[]>("calEvents", {
    asArray: true,
    fallback: [],
  });
  const [config, saveConfig] = useFirebaseData<Config>("config", {
    fallback: {},
  });

  // Keep public `shared/<token>` entries in sync whenever calendar events or
  // clients change, so existing share links stay live.
  const { user } = useAuth();
  const lastSync = useRef<string>("");

  // One-shot auto-migration: merges any legacy `realtors/` list into
  // `clients/` the first time a signed-in user loads the new app. Idempotent —
  // once `realtors/` is empty, this becomes a no-op.
  const migrationRan = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (migrationRan.current === user.uid) return;
    migrationRan.current = user.uid;
    (async () => {
      try {
        const snap = await get(ref(db, `users/${user.uid}/realtors`));
        const val = snap.val();
        const hasLegacy =
          (Array.isArray(val) && val.filter(Boolean).length > 0) ||
          (val && typeof val === "object" && Object.keys(val).length > 0);
        if (!hasLegacy) return;
        const plan = await commitMigration(user.uid);
        toast.success("Merged realtors into Clients", {
          description: `${plan.mergedPairs.length} paired, ${plan.standaloneRealtors} kept, ${plan.eventsRewrites} events updated.`,
        });
      } catch (err) {
        console.error("[lumeria migration] auto-run failed", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!clients || !calEvents) return;
    const fingerprint = JSON.stringify({ clients, calEvents, config });
    if (fingerprint === lastSync.current) return;
    lastSync.current = fingerprint;
    syncSharedData(user.uid, clients, calEvents, config ?? {});
  }, [user, clients, calEvents, config]);

  const clientsById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients ?? []) {
      if (c?.id) m.set(c.id, c);
    }
    return m;
  }, [clients]);

  // Keep the latest snapshots in refs so `saveCalEvents` can stay stable
  // (no identity churn for consumers) while still reading fresh state inside
  // the notification-dispatch logic.
  const calEventsRef = useRef<CalEvent[]>(calEvents ?? []);
  const clientsByIdRef = useRef<Map<string, Client>>(clientsById);
  const configRef = useRef<Config>(config ?? {});
  useEffect(() => {
    calEventsRef.current = calEvents ?? [];
  }, [calEvents]);
  useEffect(() => {
    clientsByIdRef.current = clientsById;
  }, [clientsById]);
  useEffect(() => {
    configRef.current = config ?? {};
  }, [config]);

  const saveCalEvents = useCallback(
    (next: CalEvent[]) => {
      const prev = calEventsRef.current;
      const prevById = new Map(prev.map((e) => [e.id, e]));
      const clientsByIdNow = clientsByIdRef.current;
      const configNow = configRef.current;

      // Persist immediately — notifications are fire-and-forget so a slow or
      // failing email must not delay the calendar write.
      rawSaveCalEvents(next);

      // Respect the master toggle in Settings → Notifications. Default is
      // enabled (undefined / true). Only an explicit `false` disables sends.
      if (configNow.bookingEmail?.enabled === false) return;

      const toEmail: Array<{ ev: CalEvent; client: Client }> = [];
      for (const ev of next) {
        if (ev.confirmationEmailedAt) continue;
        const check = isConfirmable(ev, clientsByIdNow);
        if (!check.ok) continue;
        const before = prevById.get(ev.id);
        // Skip if it was already confirmable before this save — the latch is
        // the source of truth, but this extra guard avoids sending in edge
        // cases where the latch was cleared manually or lost to a bad merge.
        if (before && isConfirmable(before, clientsByIdNow).ok) continue;
        toEmail.push({ ev, client: check.client });
      }

      if (toEmail.length === 0) return;

      void Promise.all(
        toEmail.map(async ({ ev, client }) => {
          try {
            await sendBookingConfirmationEmail(ev, client, configNow);
            // Re-read latest state so we don't stomp unrelated concurrent edits.
            const latest = calEventsRef.current;
            const patched = latest.map((e) =>
              e.id === ev.id
                ? { ...e, confirmationEmailedAt: Date.now() }
                : e
            );
            rawSaveCalEvents(patched);
            toast.success("Confirmation sent", {
              description: `Emailed ${client.email}`,
            });
          } catch (err) {
            console.error("[booking-email] send failed", err);
            toast.error("Confirmation email failed", {
              description:
                err instanceof Error ? err.message : "Unknown error",
            });
          }
        })
      );
    },
    [rawSaveCalEvents]
  );

  return (
    <DataContext.Provider
      value={{
        invoices: invoices ?? [],
        drafts: drafts ?? [],
        clients: clients ?? [],
        clientsById,
        calEvents: calEvents ?? [],
        config: config ?? {},
        saveInvoices,
        saveDrafts,
        saveClients,
        saveCalEvents,
        saveConfig,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
