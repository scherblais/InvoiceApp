import { cn } from "@/lib/utils";

/**
 * Shared invoice/draft status badge. Single source of truth for the color
 * system so the dashboard panels, invoice list, and invoice document all
 * read identically.
 *
 *  - paid     → emerald  (positive, done)
 *  - unpaid   → amber    (attention, waiting)
 *  - overdue  → red      (urgent)
 *  - draft    → muted    (not yet issued)
 *  - custom   → primary  (informational, generic)
 */
export type StatusKind = "paid" | "unpaid" | "overdue" | "draft" | "custom";

interface StatusBadgeProps {
  kind: StatusKind;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

const VARIANTS: Record<StatusKind, { classes: string; defaultLabel: string }> = {
  paid: {
    classes:
      "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    defaultLabel: "Paid",
  },
  unpaid: {
    classes:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    defaultLabel: "Unpaid",
  },
  overdue: {
    classes: "border-destructive/40 bg-destructive/10 text-destructive",
    defaultLabel: "Overdue",
  },
  draft: {
    classes: "border-border bg-muted text-muted-foreground",
    defaultLabel: "Draft",
  },
  custom: {
    classes: "border-primary/30 bg-primary/10 text-primary",
    defaultLabel: "Custom",
  },
};

export function StatusBadge({
  kind,
  label,
  className,
  size = "sm",
}: StatusBadgeProps) {
  const v = VARIANTS[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border font-medium",
        size === "sm" ? "px-1.5 py-0 text-[10px] h-5" : "px-2 py-0.5 text-xs",
        v.classes,
        className
      )}
    >
      {label ?? v.defaultLabel}
    </span>
  );
}
