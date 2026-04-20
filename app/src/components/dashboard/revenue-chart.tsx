import { useMemo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import { computeMonthlyRevenue } from "@/lib/stats";
import type { Invoice, Draft } from "@/lib/types";

interface RevenueChartProps {
  invoices: Invoice[];
  drafts: Draft[];
  months?: number;
}

/**
 * Rolling monthly revenue as a gradient-filled area chart. Built on
 * the shadcn chart primitives (recharts under the hood) so the curve,
 * grid, tooltip, and axis labels all pick up the design tokens
 * without per-component styling.
 *
 * Single series — revenue only — because stacking tax on top would
 * double-count money the photographer already saw on their stat
 * cards. Card footer summarizes the window: 12-month average + total
 * and a direction-of-travel trend vs. the previous half of the
 * window.
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

export function RevenueChart({
  invoices,
  drafts,
  months = 12,
}: RevenueChartProps) {
  const points = useMemo(
    () => computeMonthlyRevenue(invoices, drafts, months),
    [invoices, drafts, months]
  );

  const { avg, total, trendPct, trendDirection } = useMemo(() => {
    const total = points.reduce((sum, p) => sum + p.revenue, 0);
    const avg = points.length ? total / points.length : 0;
    // Compare the back half of the window to the front half — gives a
    // smoother read than month-over-month on a 12-point series.
    const half = Math.floor(points.length / 2);
    const front = points
      .slice(0, half)
      .reduce((s, p) => s + p.revenue, 0);
    const back = points
      .slice(half)
      .reduce((s, p) => s + p.revenue, 0);
    const pct = front > 0 ? ((back - front) / front) * 100 : 0;
    return {
      avg,
      total,
      trendPct: pct,
      trendDirection:
        pct > 1 ? ("up" as const) : pct < -1 ? ("down" as const) : ("flat" as const),
    };
  }, [points]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue · last {months} months</CardTitle>
        <CardDescription>
          Avg {formatCurrency(avg)} · Total {formatCurrency(total)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <AreaChart
            accessibilityLayer
            data={points}
            margin={{ left: 12, right: 12, top: 8, bottom: 0 }}
          >
            <CartesianGrid vertical={false} />
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
              width={44}
              tickFormatter={(v) => shortCurrency(Number(v))}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as
                      | { label: string; year: number }
                      | undefined;
                    return p ? `${p.label} ${p.year}` : "";
                  }}
                  formatter={(value) => [
                    formatCurrency(Number(value)),
                    "Revenue",
                  ]}
                  indicator="dot"
                />
              }
            />
            <defs>
              <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-revenue)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="revenue"
              type="natural"
              fill="url(#fillRevenue)"
              fillOpacity={0.4}
              stroke="var(--color-revenue)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {trendDirection === "up"
                ? `Trending up by ${trendPct.toFixed(1)}% this half`
                : trendDirection === "down"
                  ? `Trending down by ${Math.abs(trendPct).toFixed(1)}% this half`
                  : "Flat vs. the previous half"}{" "}
              {trendDirection === "down" ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <TrendingUp className="h-4 w-4" />
              )}
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              {points.length
                ? `${points[0].label} ${points[0].year} – ${points[points.length - 1].label} ${points[points.length - 1].year}`
                : "No data yet"}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
