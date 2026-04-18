import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card } from "@/components/ui/card";
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
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subValue,
  trend,
  warn,
}: StatCardProps) {
  return (
    <Card className="p-5 gap-3 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              trend.kind === "up" &&
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              trend.kind === "down" &&
                "bg-red-500/10 text-red-600 dark:text-red-400",
              trend.kind === "neutral" &&
                "bg-muted text-muted-foreground"
            )}
          >
            {trend.kind === "up" ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : trend.kind === "down" ? (
              <ArrowDownRight className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            {trend.text}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div
          className={cn(
            "text-2xl font-semibold tracking-tight tabular-nums",
            warn && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </div>
        {subValue ? (
          <div className="text-xs text-muted-foreground">{subValue}</div>
        ) : null}
      </div>
    </Card>
  );
}
