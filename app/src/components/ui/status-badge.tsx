import { cn } from "@/lib/utils";

/**
 * Shared invoice/draft status badge. Drives the color system used
 * across dashboard panels, invoice rows, kanban cards, and invoice
 * documents — single source of truth.
 *
 * Visual language matches the Badge primitive's tonal family:
 * soft background + matching text + ring-inset at 20% so chips
 * read as proper surfaces rather than flat fills.
 *
 *  paid     → emerald  (positive, done)
 *  unpaid   → amber    (attention, waiting)
 *  overdue  → red      (urgent)
 *  draft    → muted    (not yet issued)
 *  custom   → primary  (informational / generic)
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
      "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/25",
    defaultLabel: "Paid",
  },
  unpaid: {
    classes:
      "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400 dark:ring-amber-500/25",
    defaultLabel: "Unpaid",
  },
  overdue: {
    classes:
      "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
    defaultLabel: "Overdue",
  },
  draft: {
    classes:
      "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
    defaultLabel: "Draft",
  },
  custom: {
    classes:
      "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
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
        "inline-flex items-center rounded-full font-medium",
        size === "sm"
          ? "px-1.5 py-0 text-[10px] h-5"
          : "px-2 py-0.5 text-xs",
        v.classes,
        className
      )}
    >
      {label ?? v.defaultLabel}
    </span>
  );
}
