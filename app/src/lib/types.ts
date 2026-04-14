// Shared data types mirroring the legacy index.html Firebase schema.

export interface InvoiceItem {
  description?: string;
  total?: number;
  gst?: number;
  qst?: number;
  addons?: unknown[];
}

export interface Invoice {
  id: string;
  number?: string;
  clientId?: string;
  clientName?: string;
  status?: "sent" | "paid" | string;
  total?: number;
  totalGst?: number;
  totalQst?: number;
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

export interface Client {
  id: string;
  name?: string;
  company?: string;
  email?: string;
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
  realtorId?: string;
}

export interface Realtor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
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
