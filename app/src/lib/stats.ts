import type { Invoice, Draft } from "@/lib/types";
import { monthKey } from "@/lib/format";

export interface DashboardStats {
  monthRevenue: number;
  lastMonthRevenue: number;
  ytdRevenue: number;
  pendingAmount: number;
  pendingCount: number;
  draftCount: number;
  monthTax: number;
  ytdTax: number;
  revChangePct: number;
  revBadgeText: string;
  revBadgeKind: "up" | "down" | "neutral";
}

function invoiceMonth(inv: Invoice): string {
  if (inv.month) return inv.month;
  if (inv.createdAt) {
    return monthKey(new Date(inv.createdAt));
  }
  return "";
}

function sumItems(
  items?: { total?: number; gst?: number; qst?: number }[]
): { total: number; tax: number } {
  if (!items?.length) return { total: 0, tax: 0 };
  let total = 0;
  let tax = 0;
  for (const it of items) {
    total += it.total ?? 0;
    tax += (it.gst ?? 0) + (it.qst ?? 0);
  }
  return { total, tax };
}

export function computeDashboardStats(
  invoices: Invoice[],
  drafts: Draft[],
  now: Date = new Date()
): DashboardStats {
  const thisMonth = monthKey(now);
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = monthKey(lastDate);
  const ytdStart = `${now.getFullYear()}-01`;

  let monthRevenue = 0;
  let lastMonthRevenue = 0;
  let ytdRevenue = 0;
  let pendingAmount = 0;
  let pendingCount = 0;
  let monthTax = 0;
  let ytdTax = 0;

  for (const inv of invoices) {
    const im = invoiceMonth(inv);
    const isThisMonth = im === thisMonth;
    const isLastMonth = im === lastMonth;
    const inYtd = im >= ytdStart && im <= thisMonth;

    if (isThisMonth) {
      monthRevenue += inv.total ?? 0;
      monthTax += (inv.totalGst ?? 0) + (inv.totalQst ?? 0);
    }
    if (isLastMonth) lastMonthRevenue += inv.total ?? 0;
    if (inYtd) {
      ytdRevenue += inv.total ?? 0;
      ytdTax += (inv.totalGst ?? 0) + (inv.totalQst ?? 0);
    }
    if (inv.status !== "paid") {
      pendingAmount += inv.total ?? 0;
      pendingCount += 1;
    }
  }

  for (const d of drafts) {
    const dm = d.month ?? "";
    const sums = sumItems(d.items);
    if (dm === thisMonth) {
      monthRevenue += sums.total;
      monthTax += sums.tax;
    }
    if (dm === lastMonth) {
      lastMonthRevenue += sums.total;
    }
  }

  const revChangePct =
    lastMonthRevenue > 0
      ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0;

  let revBadgeText = "—";
  let revBadgeKind: DashboardStats["revBadgeKind"] = "neutral";
  if (lastMonthRevenue > 0 || monthRevenue > 0) {
    if (revChangePct > 0) {
      revBadgeText = `+${revChangePct.toFixed(1)}%`;
      revBadgeKind = "up";
    } else if (revChangePct < 0) {
      revBadgeText = `${revChangePct.toFixed(1)}%`;
      revBadgeKind = "down";
    }
  }

  return {
    monthRevenue,
    lastMonthRevenue,
    ytdRevenue,
    pendingAmount,
    pendingCount,
    draftCount: drafts.length,
    monthTax,
    ytdTax,
    revChangePct,
    revBadgeText,
    revBadgeKind,
  };
}
