// Shared data types mirroring the legacy index.html Firebase schema.

export interface InvoiceItem {
  description?: string;
  total?: number;
  gst?: number;
  qst?: number;
  addons?: unknown[];
}

export interface ClientDiscount {
  type: "%" | "$";
  value: number;
}

export interface ClientOverrides {
  // Map of package/addon id → custom price for this client
  packages?: Record<string, number>;
  addons?: Record<string, number>;
}

/**
 * A Client is the single unified contact entity — the person or agency we
 * invoice AND schedule shoots for. (Legacy builds kept "realtors" and
 * "clients" as separate lists; they have since been merged.)
 */
export interface Client {
  id: string;
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
  overrides?: ClientOverrides;
  discount?: ClientDiscount;
}

export interface Invoice {
  id: string;
  number?: string;
  clientId?: string;
  clientName?: string;
  status?: "sent" | "paid" | string;
  subtotal?: number;
  total?: number;
  totalGst?: number;
  totalQst?: number;
  discount?: number;
  discountInfo?: ClientDiscount;
  month?: string; // YYYY-MM
  createdAt?: number;
  items?: InvoiceItem[];
}

export interface Draft {
  id: string;
  clientId?: string;
  month?: string;
  items?: InvoiceItem[];
  savedAt?: number;
  updatedAt?: number;
}

export interface CalEvent {
  id: string;
  title?: string;
  type?: string;
  date: string; // YYYY-MM-DD
  start?: string; // HH:mm
  end?: string; // HH:mm
  startTime?: string; // legacy
  color?: string;
  status?: string;
  address?: string;
  unit?: string;
  notes?: string;
  contactName?: string;
  /** Unified client reference. */
  clientId?: string;
  /**
   * @deprecated Legacy field from when realtors and clients were split. New
   * events write `clientId`; reads fall back to this. Removed once all events
   * are migrated via `migrateRealtorsToClients`.
   */
  realtorId?: string;
}

/**
 * Returns the effective client id for a calendar event, tolerating both the
 * new `clientId` field and the legacy `realtorId` field during migration.
 */
export function eventClientId(ev: CalEvent): string | undefined {
  return ev.clientId ?? ev.realtorId ?? undefined;
}

export interface ConfigPackage {
  id: string;
  name: string;
  price: number;
  extraLabel?: string;
  extraUnit?: string;
  extraPrice?: number;
}

export interface ConfigAddon {
  id: string;
  name: string;
  price: number;
  qty?: boolean;
}

export interface ConfigTravel {
  freeKm: number;
  ratePerKm: number;
}

export interface ConfigTaxes {
  gst: number;
  qst: number;
}

export interface Config {
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  packages?: ConfigPackage[];
  addons?: ConfigAddon[];
  travel?: ConfigTravel;
  taxes?: ConfigTaxes;
  [key: string]: unknown;
}
