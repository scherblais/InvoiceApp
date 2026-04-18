import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import { useAuth } from "@/contexts/auth-context";
import { syncSharedData } from "@/lib/shared";
import { db, ref, get } from "@/lib/firebase";
import { commitMigration } from "@/lib/migration";
import type {
  Invoice,
  Draft,
  Client,
  CalEvent,
  Config,
} from "@/lib/types";

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
  const [calEvents, saveCalEvents] = useFirebaseData<CalEvent[]>("calEvents", {
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
        /* eslint-disable-next-line no-console */
        console.error("[lumeria migration] auto-run failed", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!clients || !calEvents) return;
    const fingerprint = JSON.stringify({ clients, calEvents });
    if (fingerprint === lastSync.current) return;
    lastSync.current = fingerprint;
    syncSharedData(user.uid, clients, calEvents);
  }, [user, clients, calEvents]);

  const clientsById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients ?? []) {
      if (c?.id) m.set(c.id, c);
    }
    return m;
  }, [clients]);

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
