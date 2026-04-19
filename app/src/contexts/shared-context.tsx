import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import type { SharedData, SharedEvent } from "@/lib/shared";

/**
 * The four-lane status pipeline + lookup maps the shared-side
 * pages all read from. Computed once in the shell so Home / Board
 * / Deliveries / Pricing don't each walk the events array.
 */
export interface SharedLanes {
  received: SharedEvent[];
  pending: SharedEvent[];
  scheduled: SharedEvent[];
  delivered: SharedEvent[];
}

export interface SharedContextValue {
  data: SharedData | null;
  events: SharedEvent[];
  lanes: SharedLanes;
  /** Open the full-screen delivery gallery for a specific event. */
  openGallery: (ev: SharedEvent) => void;
}

const SharedContext = createContext<SharedContextValue | null>(null);

export function SharedDataProvider({
  value,
  children,
}: {
  value: SharedContextValue;
  children: ReactNode;
}) {
  return (
    <SharedContext.Provider value={value}>{children}</SharedContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSharedData(): SharedContextValue {
  const ctx = useContext(SharedContext);
  if (!ctx) {
    throw new Error("useSharedData must be used inside SharedDataProvider");
  }
  return ctx;
}
