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

/**
 * A single deliverable attached to a shoot. Photos carry both an
 * `original` and an `compressed` (MLS-ready) variant; videos only have
 * the original. Stored inline on the event record so the shared page
 * can render download links without a second read.
 */
export interface EventFileVariant {
  path: string;
  url: string;
  size: number;
  width?: number;
  height?: number;
}

export interface EventFile {
  id: string;
  name: string;
  kind: "photo" | "video" | "other";
  mimeType: string;
  uploadedAt: number;
  original: EventFileVariant;
  /** Only photos have a compressed variant. */
  compressed?: EventFileVariant;
}

export interface CalEvent {
  id: string;
  title?: string;
  type?: string;
  /**
   * Event date in YYYY-MM-DD form. Empty string / undefined means
   * "to be scheduled" — the shoot is known but hasn't been booked
   * onto a specific day yet. The calendar views silently skip
   * dateless entries; the dashboard ToSchedulePanel surfaces them.
   */
  date?: string;
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
  /** Photographer-uploaded deliverables. */
  files?: EventFile[];
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
  /**
   * Origin address for travel fee calculations. When undefined, the
   * photographer's default (Carignan, QC) is used. Free-form string —
   * whatever Google's Distance Matrix can geocode.
   */
  origin?: string;
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
