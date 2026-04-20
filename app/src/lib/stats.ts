import type { Invoice, Draft } from "@/lib/types";
import { monthKey } from "@/lib/format";

export interface MonthlyRevenuePoint {
  key: string; // "YYYY-MM"
  label: string; // "Jan"
  year: number;
  revenue: number; // gross total for the month (matches the stat cards)
  tax: number;
}

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
    const inYtd = dm >= ytdStart && dm <= thisMonth;
    if (dm === thisMonth) {
      monthRevenue += sums.total;
      monthTax += sums.tax;
    }
    if (dm === lastMonth) {
      lastMonthRevenue += sums.total;
    }
    // Year-to-date folds in every draft in the current calendar year,
    // including this month's in-progress drafts, so the YTD stat
    // reflects real-time income instead of lagging by one billing
    // cycle.
    if (inYtd) {
      ytdRevenue += sums.total;
      ytdTax += sums.tax;
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

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Rolling monthly revenue series ending at `now`. Aggregates invoice + draft
 * totals into the `months` most recent calendar buckets.
 */
export function computeMonthlyRevenue(
  invoices: Invoice[],
  drafts: Draft[],
  months = 12,
  now: Date = new Date()
): MonthlyRevenuePoint[] {
  const buckets = new Map<string, MonthlyRevenuePoint>();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    buckets.set(key, {
      key,
      label: MONTH_LABELS[d.getMonth()],
      year: d.getFullYear(),
      revenue: 0,
      tax: 0,
    });
  }

  for (const inv of invoices) {
    const im = invoiceMonth(inv);
    const b = buckets.get(im);
    if (!b) continue;
    b.revenue += inv.total ?? 0;
    b.tax += (inv.totalGst ?? 0) + (inv.totalQst ?? 0);
  }

  for (const d of drafts) {
    const b = d.month ? buckets.get(d.month) : undefined;
    if (!b) continue;
    const { total, tax } = sumItems(d.items);
    b.revenue += total;
    b.tax += tax;
  }

  return Array.from(buckets.values());
}
