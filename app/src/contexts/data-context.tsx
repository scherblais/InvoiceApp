import { createContext, useContext, type ReactNode } from "react";
import { useFirebaseData } from "@/hooks/use-firebase-data";
import type {
  Invoice,
  Draft,
  Client,
  CalEvent,
  Realtor,
  Config,
} from "@/lib/types";

interface DataContextValue {
  invoices: Invoice[];
  drafts: Draft[];
  clients: Client[];
  calEvents: CalEvent[];
  realtors: Realtor[];
  config: Config;
  saveInvoices: (v: Invoice[]) => void;
  saveDrafts: (v: Draft[]) => void;
  saveClients: (v: Client[]) => void;
  saveCalEvents: (v: CalEvent[]) => void;
  saveRealtors: (v: Realtor[]) => void;
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
  const [realtors, saveRealtors] = useFirebaseData<Realtor[]>("realtors", {
    asArray: true,
    fallback: [],
  });
  const [config, saveConfig] = useFirebaseData<Config>("config", {
    fallback: {},
  });

  return (
    <DataContext.Provider
      value={{
        invoices: invoices ?? [],
        drafts: drafts ?? [],
        clients: clients ?? [],
        calEvents: calEvents ?? [],
        realtors: realtors ?? [],
        config: config ?? {},
        saveInvoices,
        saveDrafts,
        saveClients,
        saveCalEvents,
        saveRealtors,
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
