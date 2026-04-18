import { useEffect, useMemo, useRef, useState } from "react";
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
  const allPoints = useMemo(
    () => computeMonthlyRevenue(invoices, drafts, months),
    [invoices, drafts, months]
  );

  // Measure the container so we can render in real pixels. This keeps text
  // and bar widths constant-sized across breakpoints instead of scaling with
  // a fixed viewBox.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    if (!wrapRef.current) return;
    const el = wrapRef.current;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [hover, setHover] = useState<number | null>(null);

  // Mobile shrinks the window to 6 months so bars stay readable. The summary
  // (avg / total) still reflects the full 12-month window so the numbers line
  // up with the stat cards above.
  const compact = width < 520;
  const points = compact ? allPoints.slice(-6) : allPoints;

  const maxRevenue = Math.max(...points.map((p) => p.revenue), 0);
  const yMax = niceMax(maxRevenue);
  const windowTotal = points.reduce((sum, p) => sum + p.revenue, 0);
  const windowAvg = windowTotal / points.length;

  const H = compact ? 180 : 240;
  const PAD_L = compact ? 38 : 48;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 28;
  const W = Math.max(width, 240);
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const barSlot = innerW / points.length;
  const barW = Math.max(
    compact ? 10 : 12,
    Math.min(compact ? 28 : 42, barSlot * 0.62)
  );

  const yTicks = compact ? 3 : 4;
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

  // One continuous hit region across all bars — prevents the mouseleave /
  // mouseenter flicker you get when each bar owns its own <rect>.
  const handleMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
    const x = clientX - rect.left;
    if (x < PAD_L || x > W - PAD_R) {
      setHover(null);
      return;
    }
    const idx = Math.floor((x - PAD_L) / barSlot);
    if (idx < 0 || idx >= points.length) {
      setHover(null);
      return;
    }
    if (idx !== hover) setHover(idx);
  };

  // Tooltip positioning: clamp horizontally so it never overflows the card.
  const tooltipLeft = activeGeom
    ? Math.max(60, Math.min(W - 60, activeGeom.x + barW / 2))
    : 0;

  return (
    <Card className="shadow-none gap-3">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-0">
        <div>
          <CardTitle className="text-sm font-medium">
            Revenue · last {compact ? 6 : months} months
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Avg <span className="font-medium text-foreground">{formatCurrency(windowAvg)}</span>
            <span className="mx-1.5">·</span>
            Total <span className="font-medium text-foreground">{formatCurrency(windowTotal)}</span>
          </p>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div ref={wrapRef} className="relative w-full">
          <svg
            width={W}
            height={H}
            className="block"
            role="img"
            aria-label={`Monthly revenue for the last ${points.length} months`}
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
            onTouchStart={handleMove}
            onTouchMove={handleMove}
            onTouchEnd={() => setHover(null)}
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
                    className="fill-muted-foreground"
                    fontSize={10}
                  >
                    {shortCurrency(v)}
                  </text>
                </g>
              );
            })}

            {/* Average line */}
            {windowAvg > 0 && yMax > 0 && (
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={PAD_T + innerH - (windowAvg / yMax) * innerH}
                y2={PAD_T + innerH - (windowAvg / yMax) * innerH}
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
                <g key={p.key} style={{ pointerEvents: "none" }}>
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
                    y={H - 10}
                    textAnchor="middle"
                    className="fill-muted-foreground"
                    fontSize={10}
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
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border bg-popover px-2 py-1.5 text-xs text-popover-foreground"
              style={{
                left: `${tooltipLeft}px`,
                top: `${activeGeom.y - 4}px`,
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
