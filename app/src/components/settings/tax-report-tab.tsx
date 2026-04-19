import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useData } from "@/contexts/data-context";
import { formatCurrency } from "@/lib/format";
import type { Invoice } from "@/lib/types";

interface MonthBreakdown {
  key: string; // "2026-Q1"
  label: string; // "Q1 2026 (Jan – Mar)"
  months: string[];
  year: number;
  quarter: number;
}

interface ReportTotals {
  invoiceCount: number;
  subtotal: number;
  gst: number;
  qst: number;
  travel: number;
  total: number;
  byMonth: {
    key: string; // "2026-03"
    label: string; // "Mar 2026"
    count: number;
    subtotal: number;
    gst: number;
    qst: number;
    travel: number;
    total: number;
  }[];
  byClient: {
    name: string;
    count: number;
    total: number;
  }[];
}

const MONTH_NAMES = [
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
 * Given a list of invoices, walk every item and sum up what the
 * photographer owes the tax man this quarter (or year). Uses the
 * fields the invoice editor already writes on send — subtotal,
 * totalGst, totalQst, total — so no re-computation of tax is needed.
 * Travel is pulled off the line items.
 */
function buildReport(
  invoices: Invoice[],
  filter: (inv: Invoice) => boolean
): ReportTotals {
  const filtered = invoices.filter(filter);
  const byMonthMap = new Map<string, ReportTotals["byMonth"][number]>();
  const byClientMap = new Map<string, ReportTotals["byClient"][number]>();

  let invoiceCount = 0;
  let subtotal = 0;
  let gst = 0;
  let qst = 0;
  let travel = 0;
  let total = 0;

  for (const inv of filtered) {
    invoiceCount += 1;
    const sub = inv.subtotal ?? 0;
    const g = inv.totalGst ?? 0;
    const q = inv.totalQst ?? 0;
    const t = inv.total ?? 0;
    let travelOnThis = 0;
    for (const it of (inv as { items?: { travel?: { fee?: number } }[] }).items ?? []) {
      travelOnThis += it.travel?.fee ?? 0;
    }

    subtotal += sub;
    gst += g;
    qst += q;
    total += t;
    travel += travelOnThis;

    // Month bucket
    const monthKey = inv.month || (inv.createdAt ? monthKeyFromTs(inv.createdAt) : "");
    if (monthKey) {
      const label = labelForMonth(monthKey);
      const prev = byMonthMap.get(monthKey) ?? {
        key: monthKey,
        label,
        count: 0,
        subtotal: 0,
        gst: 0,
        qst: 0,
        travel: 0,
        total: 0,
      };
      prev.count += 1;
      prev.subtotal += sub;
      prev.gst += g;
      prev.qst += q;
      prev.travel += travelOnThis;
      prev.total += t;
      byMonthMap.set(monthKey, prev);
    }

    // Client bucket
    const clientName = inv.clientName ?? "Unknown";
    const prevClient = byClientMap.get(clientName) ?? {
      name: clientName,
      count: 0,
      total: 0,
    };
    prevClient.count += 1;
    prevClient.total += t;
    byClientMap.set(clientName, prevClient);
  }

  return {
    invoiceCount,
    subtotal: round2(subtotal),
    gst: round2(gst),
    qst: round2(qst),
    travel: round2(travel),
    total: round2(total),
    byMonth: Array.from(byMonthMap.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    ),
    byClient: Array.from(byClientMap.values()).sort(
      (a, b) => b.total - a.total
    ),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthKeyFromTs(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelForMonth(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  const idx = Math.max(0, (parseInt(m, 10) || 1) - 1);
  return `${MONTH_NAMES[idx]} ${y}`;
}

/** Build every period option we offer in the dropdown — the most
 *  recent four quarters + the current and previous calendar year. */
function buildPeriodOptions(today: Date = new Date()): {
  id: string;
  label: string;
  filter: (inv: Invoice) => boolean;
}[] {
  const year = today.getFullYear();
  const monthIdx = today.getMonth(); // 0-based
  const currentQuarter = Math.floor(monthIdx / 3) + 1;

  const quarters: MonthBreakdown[] = [];
  // Walk the last six quarters ending at the current one.
  for (let i = 0; i < 6; i++) {
    let q = currentQuarter - i;
    let y = year;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }
    const firstMonth = (q - 1) * 3;
    const months = [firstMonth, firstMonth + 1, firstMonth + 2].map(
      (m) => `${y}-${String(m + 1).padStart(2, "0")}`
    );
    const startName = MONTH_NAMES[firstMonth];
    const endName = MONTH_NAMES[firstMonth + 2];
    quarters.push({
      key: `${y}-Q${q}`,
      label: `Q${q} ${y} (${startName} – ${endName})`,
      months,
      year: y,
      quarter: q,
    });
  }

  const periods: { id: string; label: string; filter: (inv: Invoice) => boolean }[] =
    quarters.map((q) => ({
      id: q.key,
      label: q.label,
      filter: (inv: Invoice) => !!inv.month && q.months.includes(inv.month),
    }));

  // Year-to-date + full previous year for annual summaries.
  periods.push({
    id: `${year}-YTD`,
    label: `${year} year to date`,
    filter: (inv: Invoice) => !!inv.month && inv.month.startsWith(`${year}-`),
  });
  periods.push({
    id: `${year - 1}-FULL`,
    label: `${year - 1} (full year)`,
    filter: (inv: Invoice) =>
      !!inv.month && inv.month.startsWith(`${year - 1}-`),
  });

  return periods;
}

function downloadFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function toCsv(report: ReportTotals, periodLabel: string): string {
  const rows: (string | number)[][] = [];
  rows.push([`Lumeria Media · Tax report`]);
  rows.push([`Period`, periodLabel]);
  rows.push([`Invoices`, report.invoiceCount]);
  rows.push([]);
  rows.push([`Subtotal (CAD)`, report.subtotal.toFixed(2)]);
  rows.push([`GST (5%) collected`, report.gst.toFixed(2)]);
  rows.push([`QST (9.975%) collected`, report.qst.toFixed(2)]);
  rows.push([`Travel fees billed`, report.travel.toFixed(2)]);
  rows.push([`Total billed`, report.total.toFixed(2)]);
  rows.push([]);
  rows.push([`By month`]);
  rows.push([`Month`, `Invoices`, `Subtotal`, `GST`, `QST`, `Travel`, `Total`]);
  for (const m of report.byMonth) {
    rows.push([
      m.label,
      m.count,
      m.subtotal.toFixed(2),
      m.gst.toFixed(2),
      m.qst.toFixed(2),
      m.travel.toFixed(2),
      m.total.toFixed(2),
    ]);
  }
  rows.push([]);
  rows.push([`By client`]);
  rows.push([`Client`, `Invoices`, `Total`]);
  for (const c of report.byClient) {
    rows.push([c.name, c.count, c.total.toFixed(2)]);
  }
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell);
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    )
    .join("\n");
}

export function TaxReportTab() {
  const { invoices } = useData();
  const periods = useMemo(() => buildPeriodOptions(), []);
  const [selectedId, setSelectedId] = useState<string>(periods[0]?.id ?? "");
  const selected = periods.find((p) => p.id === selectedId) ?? periods[0];

  const report = useMemo(
    () => buildReport(invoices, selected.filter),
    [invoices, selected]
  );

  const handleDownloadCsv = () => {
    const csv = toCsv(report, selected.label);
    downloadFile(`lumeria-tax-${selected.id}.csv`, "text/csv", csv);
    toast.success("Report downloaded");
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">Tax report</h3>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              Summary of invoiced revenue, GST collected, QST collected, and
              travel fees billed. Pick a quarter (for filings) or a full year
              (for reconciliation) and download a CSV your accountant can drop
              straight into a spreadsheet.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            <Label htmlFor="tax-period">Period</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger id="tax-period" className="w-full md:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Summary tiles */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <SummaryTile
          label="Invoices"
          value={String(report.invoiceCount)}
        />
        <SummaryTile
          label="Subtotal"
          value={formatCurrency(report.subtotal, 2)}
        />
        <SummaryTile
          label="GST (5%)"
          value={formatCurrency(report.gst, 2)}
          tone="primary"
        />
        <SummaryTile
          label="QST (9.975%)"
          value={formatCurrency(report.qst, 2)}
          tone="primary"
        />
        <SummaryTile
          label="Travel billed"
          value={formatCurrency(report.travel, 2)}
        />
      </section>

      {/* By month */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Breakdown by month
        </h3>
        <div className="overflow-hidden rounded-lg border bg-card">
          {report.byMonth.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No invoices in this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Invoices</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">QST</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {report.byMonth.map((m) => (
                  <tr key={m.key}>
                    <td className="px-4 py-3 font-medium">{m.label}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                      {m.count}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(m.subtotal, 2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(m.gst, 2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(m.qst, 2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatCurrency(m.total, 2)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 bg-muted/30 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {report.invoiceCount}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(report.subtotal, 2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(report.gst, 2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(report.qst, 2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCurrency(report.total, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* By client */}
      {report.byClient.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Top clients this period
          </h3>
          <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
            {report.byClient.slice(0, 8).map((c) => (
              <li key={c.name} className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.count} {c.count === 1 ? "invoice" : "invoices"}
                  </div>
                </div>
                <div className="text-sm font-semibold tabular-nums">
                  {formatCurrency(c.total, 2)}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Download */}
      <section className="flex flex-col gap-3 rounded-lg border border-dashed bg-muted/20 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden />
            Export for your accountant
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            One CSV with the summary + monthly breakdown + top clients.
          </p>
        </div>
        <Button size="sm" onClick={handleDownloadCsv}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden />
          Download CSV
        </Button>
      </section>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4 shadow-xs">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </div>
      <div
        className={
          tone === "primary"
            ? "text-lg font-semibold tracking-tight tabular-nums text-primary"
            : "text-lg font-semibold tracking-tight tabular-nums"
        }
      >
        {value}
      </div>
    </div>
  );
}
