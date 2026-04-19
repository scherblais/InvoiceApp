import type { SharedEvent } from "@/lib/shared";

export function formatTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${hr12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function formatFullDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function formatRelativeDate(iso: string): string {
  if (!iso) return "TBD";
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  if (iso === todayISO) return "Today";
  if (iso === tomorrowISO) return "Tomorrow";
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDollar(value: number): string {
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

export function eventLocation(ev: SharedEvent): string {
  if (ev.unit && ev.address) return `${ev.address}, ${ev.unit}`;
  return ev.address ?? ev.title ?? "Untitled";
}
