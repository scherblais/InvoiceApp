import { Badge } from "@/components/ui/badge";

/**
 * Shared invoice/draft status badge. Built on the stock shadcn Badge
 * primitive — no custom variants — with a colored dot prefix to
 * distinguish statuses at a glance.
 */
export type StatusKind = "paid" | "unpaid" | "overdue" | "draft" | "custom";

interface StatusBadgeProps {
  kind: StatusKind;
  label?: string;
  className?: string;
}

const DOT_CLASS: Record<StatusKind, string> = {
  paid: "bg-emerald-500",
  unpaid: "bg-amber-500",
  overdue: "bg-destructive",
  draft: "bg-muted-foreground",
  custom: "bg-primary",
};

const LABELS: Record<StatusKind, string> = {
  paid: "Paid",
  unpaid: "Unpaid",
  overdue: "Overdue",
  draft: "Draft",
  custom: "Custom",
};

const VARIANT: Record<StatusKind, "default" | "secondary" | "destructive" | "outline"> = {
  paid: "secondary",
  unpaid: "secondary",
  overdue: "destructive",
  draft: "outline",
  custom: "secondary",
};

export function StatusBadge({ kind, label, className }: StatusBadgeProps) {
  return (
    <Badge variant={VARIANT[kind]} className={className}>
      <span
        aria-hidden
        className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${DOT_CLASS[kind]}`}
      />
      {label ?? LABELS[kind]}
    </Badge>
  );
}
