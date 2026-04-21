import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  subValue?: string;
  trend?: {
    text: string;
    kind: "up" | "down" | "neutral";
  };
  warn?: boolean;
  loading?: boolean;
}

/**
 * Compact, high-density stat card for the dashboard grid. The layout
 * keeps the label high and the big number low so columns of cards scan
 * like a spreadsheet — you can find the number you want with your eye
 * without reading labels each time.
 *
 * A thin inner hairline above the value separates the metadata row
 * (icon + trend chip) from the figure itself, giving the card a quiet
 * editorial structure instead of looking like a floating number.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  subValue,
  trend,
  warn,
  loading,
}: StatCardProps) {
  if (loading) {
    return (
      <Card className="gap-4 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="group gap-3 p-4 transition-all duration-200 hover:shadow-sm md:gap-4 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
              trend.kind === "up" &&
                "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
              trend.kind === "down" &&
                "bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
              trend.kind === "neutral" &&
                "bg-muted text-muted-foreground"
            )}
          >
            {trend.kind === "up" ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : trend.kind === "down" ? (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            ) : (
              <Minus className="h-3 w-3" aria-hidden />
            )}
            {trend.text}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-[22px] font-semibold leading-none tracking-tight tabular-nums md:text-[26px]",
            warn && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </div>
        {subValue ? (
          <div className="text-xs text-muted-foreground tabular-nums">
            {subValue}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
