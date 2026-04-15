import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { computeMonthlyRevenue } from "@/lib/stats";
import type { Invoice, Draft } from "@/lib/types";

interface RevenueChartProps {
  invoices: Invoice[];
  drafts: Draft[];
  months?: number;
}

/** Round the chart's Y axis up to a friendly tick value. */
function niceMax(max: number): number {
  if (max <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return nice * pow;
}

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
  const [hover, setHover] = useState<number | null>(null);

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
  const yMax = niceMax(maxRevenue);
  const total = points.reduce((sum, p) => sum + p.revenue, 0);
  const avg = total / points.length;

  // Layout (viewBox — the SVG scales to its container).
  const W = 720;
  const H = 220;
  const PAD_L = 48;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 32;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barSlot = innerW / points.length;
  const barW = Math.max(8, Math.min(42, barSlot * 0.6));

  const yTicks = 4;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round((yMax / yTicks) * i)
  );

  const barFor = (i: number, value: number) => {
    const x = PAD_L + barSlot * i + (barSlot - barW) / 2;
    const h = yMax > 0 ? (value / yMax) * innerH : 0;
    const y = PAD_T + innerH - h;
    return { x, y, h };
  };

  const active = hover != null ? points[hover] : null;
  const activeGeom = hover != null ? barFor(hover, points[hover].revenue) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-semibold">
            Revenue — last {months} months
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg {formatCurrency(avg)} · Total {formatCurrency(total)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-[240px] w-full"
            role="img"
            aria-label={`Monthly revenue for the last ${months} months`}
          >
            {/* Y-axis grid + labels */}
            {tickValues.map((v, i) => {
              const y = PAD_T + innerH - (v / yMax) * innerH;
              return (
                <g key={i}>
                  <line
                    x1={PAD_L}
                    x2={W - PAD_R}
                    y1={y}
                    y2={y}
                    className="stroke-border"
                    strokeDasharray={i === 0 ? "0" : "2 3"}
                  />
                  <text
                    x={PAD_L - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {shortCurrency(v)}
                  </text>
                </g>
              );
            })}

            {/* Average line */}
            {avg > 0 && yMax > 0 && (
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + innerH - (avg / yMax) * innerH}
                y2={PAD_T + innerH - (avg / yMax) * innerH}
                className="stroke-muted-foreground/40"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}

            {/* Bars + X labels */}
            {points.map((p, i) => {
              const { x, y, h } = barFor(i, p.revenue);
              const isActive = hover === i;
              const isEmpty = p.revenue === 0;
              return (
                <g key={p.key}>
                  {/* Wider invisible hit area for hover */}
                  <rect
                    x={PAD_L + barSlot * i}
                    y={PAD_T}
                    width={barSlot}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <rect
                    x={x}
                    y={isEmpty ? PAD_T + innerH - 2 : y}
                    width={barW}
                    height={isEmpty ? 2 : h}
                    rx={3}
                    className={
                      isEmpty
                        ? "fill-muted"
                        : isActive
                          ? "fill-primary"
                          : "fill-primary/70"
                    }
                  />
                  <text
                    x={x + barW / 2}
                    y={H - 12}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[10px]"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {active && activeGeom && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1.5 text-xs text-popover-foreground shadow-md"
              style={{
                left: `${((activeGeom.x + 21) / W) * 100}%`,
                top: `${(activeGeom.y / H) * 100}%`,
              }}
            >
              <div className="font-medium">
                {active.label} {active.year}
              </div>
              <div className="tabular-nums">
                {formatCurrency(active.revenue)}
              </div>
              {active.tax > 0 && (
                <div className="tabular-nums text-muted-foreground">
                  incl. {formatCurrency(active.tax)} tax
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
