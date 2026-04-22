import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { computeMonthlyRevenue } from "@/lib/stats";
import type { Invoice, Draft } from "@/lib/types";

interface RevenueChartProps {
  invoices: Invoice[];
  drafts: Draft[];
}

type RangeMonths = 3 | 6 | 12;
const RANGE_OPTIONS: RangeMonths[] = [3, 6, 12];
const RANGE_LABEL: Record<RangeMonths, string> = {
  3: "3M",
  6: "6M",
  12: "12M",
};

/**
 * Monthly revenue history rendered as bars — one bar per calendar month
 * within the selected window. The current month gets the primary colour
 * so the eye lands on "where am I right now"; prior months sit at lower
 * opacity. A dashed reference line at the window's average makes each
 * bar readable as above- or below-trend at a glance.
 *
 * Header doubles as a stat card: this month's revenue is the hero number,
 * with a delta vs. last month, then average / total / range tabs as the
 * supporting layer.
 */
const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

function shortCurrency(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    return `$${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `$${Math.round(value)}`;
}

export function RevenueChart({ invoices, drafts }: RevenueChartProps) {
  const [range, setRange] = useState<RangeMonths>(12);

  // Always compute the full 12-month series so range changes are
  // instant (no recomputation of invoices/drafts), then slice the tail.
  const fullPoints = useMemo(
    () => computeMonthlyRevenue(invoices, drafts, 12),
    [invoices, drafts]
  );
  const points = useMemo(() => fullPoints.slice(-range), [fullPoints, range]);

  const { avg, total, monthRevenue, prevMonthRevenue, deltaPct, deltaKind } =
    useMemo(() => {
      const total = points.reduce((sum, p) => sum + p.revenue, 0);
      const avg = points.length ? total / points.length : 0;
      const monthRevenue = points.length
        ? points[points.length - 1].revenue
        : 0;
      const prevMonthRevenue =
        points.length > 1 ? points[points.length - 2].revenue : 0;
      const deltaPct =
        prevMonthRevenue > 0
          ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
          : 0;
      const deltaKind: "up" | "down" | "flat" =
        prevMonthRevenue <= 0
          ? "flat"
          : deltaPct > 1
            ? "up"
            : deltaPct < -1
              ? "down"
              : "flat";
      return {
        avg,
        total,
        monthRevenue,
        prevMonthRevenue,
        deltaPct,
        deltaKind,
      };
    }, [points]);

  const lastIndex = points.length - 1;
  const hasAnyRevenue = total > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b bg-muted/20 sm:flex-row sm:items-end sm:justify-between">
        {/* Hero: this month's revenue with a delta-vs-last-month chip
            and supporting avg/total muted line. */}
        <div className="flex flex-col gap-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            This month
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(monthRevenue)}
            </div>
            {deltaKind !== "flat" ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                  deltaKind === "up"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                )}
              >
                {deltaKind === "up" ? (
                  <TrendingUp className="h-3 w-3" aria-hidden />
                ) : (
                  <TrendingDown className="h-3 w-3" aria-hidden />
                )}
                {deltaKind === "up" ? "+" : ""}
                {deltaPct.toFixed(1)}%
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {prevMonthRevenue > 0 ? "flat vs last month" : "no prior data"}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            Avg {formatCurrency(avg)} · Total {formatCurrency(total)} ·{" "}
            <span className="lowercase">last {range} months</span>
          </div>
        </div>

        {/* Range toggle — segmented control over the same window. */}
        <div className="inline-flex shrink-0 items-center rounded-md border bg-background p-0.5">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-medium tabular-nums transition-colors",
                range === r
                  ? "bg-muted text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {RANGE_LABEL[r]}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-6 pb-4 sm:px-4">
        {hasAnyRevenue ? (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart
              accessibilityLayer
              data={points}
              margin={{ left: 8, right: 8, top: 12, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={48}
                tickFormatter={(v) => shortCurrency(Number(v))}
              />
              <ChartTooltip
                cursor={{ fill: "var(--color-revenue)", fillOpacity: 0.06 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelFormatter={(_, payload) => {
                      const p = payload?.[0]?.payload as
                        | { label: string; year: number }
                        | undefined;
                      return p ? `${p.label} ${p.year}` : "";
                    }}
                    formatter={(value, _name, item) => {
                      const p = item?.payload as
                        | { count?: number }
                        | undefined;
                      const count = p?.count ?? 0;
                      const meta =
                        count === 0
                          ? "no invoices"
                          : `${count} invoice${count === 1 ? "" : "s"}`;
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium tabular-nums text-foreground">
                            {formatCurrency(Number(value))}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {meta}
                          </span>
                        </div>
                      );
                    }}
                  />
                }
              />
              {avg > 0 ? (
                <ReferenceLine
                  y={avg}
                  stroke="var(--color-revenue)"
                  strokeOpacity={0.5}
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg ${shortCurrency(avg)}`,
                    position: "insideTopRight",
                    fill: "var(--color-revenue)",
                    fontSize: 10,
                    fillOpacity: 0.8,
                  }}
                />
              ) : null}
              <Bar
                dataKey="revenue"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              >
                {points.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill="var(--color-revenue)"
                    fillOpacity={idx === lastIndex ? 1 : 0.35}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <span>No invoices yet in this window.</span>
            <span className="text-xs">
              Once you start sending invoices, monthly revenue lands here.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
