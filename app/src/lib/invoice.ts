import type { Invoice, Draft, Client, ClientDiscount } from "@/lib/types";

// --- Types for items ---
export interface Package {
  id: string;
  name: string;
  price: number;
  extraLabel?: string;
  extraUnit?: string;
  extraPrice?: number;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  qty?: boolean;
}

export interface InvoiceItem {
  address?: string;
  unit?: string;
  pkg?: Package & { isCustom?: boolean };
  pkgAmount?: number;
  extrasQty?: number;
  extrasAmount?: number;
  addons?: (Addon & { count?: number; totalPrice?: number })[];
  addonsTotal?: number;
  travel?: { distance: number; fee: number; calculated: boolean };
  subtotal?: number;
  gst?: number;
  qst?: number;
  total?: number;
  description?: string; // legacy free-text
}

export const TAX_GST = 5;
export const TAX_QST = 9.975;

export const DEFAULT_PACKAGES: Package[] = [
  {
    id: "p1",
    name: "Interior + Exterior",
    price: 150,
    extraLabel: "Extra photos",
    extraUnit: "photos",
    extraPrice: 5,
  },
  {
    id: "p2",
    name: "Exterior Only",
    price: 85,
    extraLabel: "Extra photos",
    extraUnit: "photos",
    extraPrice: 5,
  },
];

export const DEFAULT_ADDONS: Addon[] = [
  { id: "a1", name: "Front Only (1 to 3 Photos)", price: 65, qty: false },
  { id: "a2", name: "Exterior Only (3 to 7 photos)", price: 85, qty: false },
  { id: "a3", name: "Additional Unit", price: 15, qty: true },
  { id: "a4", name: "Virtual Staging/Room Clearing", price: 10, qty: true },
  { id: "a5", name: "Social Media Video (AI)", price: 65, qty: false },
  { id: "a6", name: "Drone", price: 35, qty: false },
];

// --- Calculations ---
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeItemTotals(item: InvoiceItem): InvoiceItem {
  const pkgAmount = item.pkg?.price ?? 0;
  const extrasQty = item.extrasQty ?? 0;
  const extrasAmount = round2(extrasQty * (item.pkg?.extraPrice ?? 0));
  const addonsTotal = (item.addons ?? []).reduce(
    (sum, a) => sum + (a.totalPrice ?? a.price * (a.count ?? 1)),
    0
  );
  const travelFee = item.travel?.fee ?? 0;
  const subtotal = round2(pkgAmount + extrasAmount + addonsTotal + travelFee);
  const gst = round2((subtotal * TAX_GST) / 100);
  const qst = round2((subtotal * TAX_QST) / 100);
  const total = round2(subtotal + gst + qst);
  return {
    ...item,
    pkgAmount,
    extrasAmount,
    addonsTotal,
    subtotal,
    gst,
    qst,
    total,
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discount: number;
  discountInfo?: ClientDiscount;
  taxableSubtotal: number;
  totalGst: number;
  totalQst: number;
  total: number;
}

/**
 * Compute the absolute discount amount applied to the pre-tax subtotal for a
 * given client. Percentages are clamped to [0, 100]; flat amounts are clamped
 * to [0, subtotal] so we never produce a negative taxable subtotal.
 */
export function computeDiscountAmount(
  subtotal: number,
  discount: ClientDiscount | undefined | null
): number {
  if (!discount || !discount.value || discount.value <= 0) return 0;
  if (discount.type === "%") {
    const pct = Math.min(100, Math.max(0, discount.value));
    return round2((subtotal * pct) / 100);
  }
  return round2(Math.min(subtotal, Math.max(0, discount.value)));
}

export function computeInvoiceTotals(
  items: InvoiceItem[],
  client?: Client | null
): InvoiceTotals {
  let subtotal = 0;
  for (const raw of items) {
    const it = computeItemTotals(raw);
    subtotal += it.subtotal ?? 0;
  }
  subtotal = round2(subtotal);
  const discount = computeDiscountAmount(subtotal, client?.discount);
  const taxableSubtotal = round2(subtotal - discount);
  const totalGst = round2((taxableSubtotal * TAX_GST) / 100);
  const totalQst = round2((taxableSubtotal * TAX_QST) / 100);
  const total = round2(taxableSubtotal + totalGst + totalQst);
  return {
    subtotal,
    discount,
    discountInfo: discount > 0 ? client?.discount : undefined,
    taxableSubtotal,
    totalGst,
    totalQst,
    total,
  };
}

// --- Client-specific pricing resolution ---

/**
 * Return the price for a package after applying any per-client override.
 * Falls back to the default (config) price when no override is set.
 */
export function resolvePackagePrice(
  pkg: Package,
  client?: Client | null
): number {
  const override = client?.overrides?.packages?.[pkg.id];
  return typeof override === "number" && Number.isFinite(override)
    ? override
    : pkg.price;
}

export function resolveAddonPrice(
  addon: Addon,
  client?: Client | null
): number {
  const override = client?.overrides?.addons?.[addon.id];
  return typeof override === "number" && Number.isFinite(override)
    ? override
    : addon.price;
}

/**
 * Apply per-client overrides to a list of packages. Returns a new array
 * where each package carries its client-resolved price.
 */
export function resolvePackages(
  packages: Package[],
  client?: Client | null
): Package[] {
  return packages.map((p) => ({ ...p, price: resolvePackagePrice(p, client) }));
}

export function resolveAddons(
  addons: Addon[],
  client?: Client | null
): Addon[] {
  return addons.map((a) => ({ ...a, price: resolveAddonPrice(a, client) }));
}

// --- Numbering ---
export function clientInitials(client?: Client | null): string {
  if (!client) return "INV";
  const name = client.company || client.name || "";
  const words = name
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "INV";
  if (words.length === 1) return words[0].substring(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .substring(0, 4)
    .toUpperCase();
}

const MONTH_ABBR = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

export function autoInvoiceNumber(
  client: Client | null | undefined,
  monthVal: string, // YYYY-MM
  existing: { number?: string }[]
): string {
  const prefix = clientInitials(client);
  const [y, m] = (monthVal || "").split("-");
  const monthStr = m ? MONTH_ABBR[parseInt(m, 10) - 1] : "";
  const period = monthStr && y ? `${monthStr}${y}` : "";
  const matches = existing.filter((inv) => {
    const invPrefix = inv.number?.split("-")[0];
    return invPrefix === prefix && inv.number?.includes(period);
  });
  const seq = matches.length + 1;
  return period
    ? `${prefix}-${period}-${String(seq).padStart(3, "0")}`
    : `${prefix}-${String(seq).padStart(3, "0")}`;
}

export function monthName(month: string): string {
  const [y, m] = (month ?? "").split("-");
  if (!y || !m) return month;
  return `${
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][parseInt(m, 10) - 1]
  } ${y}`;
}

export function isOverdue(inv: Invoice): boolean {
  if (inv.status === "paid") return false;
  if (!inv.createdAt) return false;
  const days = (Date.now() - inv.createdAt) / (1000 * 60 * 60 * 24);
  return days > 30;
}

export function clientLabel(client: Client | undefined | null): string {
  if (!client) return "—";
  return client.company || client.name || "Unnamed client";
}

// Sum draft items (drafts store per-item totals so we just add)
export function draftTotal(draft: Draft): number {
  return (draft.items ?? []).reduce((sum, it) => sum + (it.total ?? 0), 0);
}
