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
}

export interface Config {
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  [key: string]: unknown;
}
