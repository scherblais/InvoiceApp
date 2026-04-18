import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  PencilLine,
  Send,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useData } from "@/contexts/data-context";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { Invoice, Draft } from "@/lib/types";

interface ActivityItem {
  id: string;
  at: number;
  icon: typeof FileText;
  iconTone: "primary" | "muted" | "success";
  title: string;
  detail: string;
  amount?: number;
  onSelect: () => void;
}

/**
 * Rolling feed of the most recent admin events — invoices sent,
 * payments received, drafts saved. Surfaces recent activity without
 * forcing the photographer to click through list pages to reconstruct
 * their own work history.
 */
export function ActivityPanel() {
  const { invoices, drafts } = useData();
  const navigate = useNavigate();

  const items = useMemo(() => buildActivity(invoices, drafts, navigate), [
    invoices,
    drafts,
    navigate,
  ]);

  const visible = items.slice(0, 6);

  return (
    <Card className="gap-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-5">
        <CardTitle className="text-sm font-medium">Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <PencilLine
              className="h-7 w-7 text-muted-foreground/60"
              aria-hidden
            />
            <span>No activity yet</span>
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onSelect}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div
                    className={
                      item.iconTone === "success"
                        ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : item.iconTone === "primary"
                          ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                          : "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                    }
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {item.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.detail}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.amount != null ? (
                      <div className="text-sm font-medium tabular-nums">
                        {formatCurrency(item.amount, 2)}
                      </div>
                    ) : null}
                    <ArrowRight
                      className="h-3.5 w-3.5 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function buildActivity(
  invoices: Invoice[],
  drafts: Draft[],
  navigate: (to: string) => void
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const inv of invoices) {
    if (inv.status === "paid") {
      items.push({
        id: `paid-${inv.id}`,
        at: inv.createdAt ?? 0,
        icon: CheckCircle2,
        iconTone: "success",
        title: `${inv.clientName ?? "Client"} marked paid`,
        detail: `${inv.number ?? ""} · ${formatShortDate(inv.createdAt)}`,
        amount: inv.total,
        onSelect: () => navigate("/invoices"),
      });
    } else {
      items.push({
        id: `sent-${inv.id}`,
        at: inv.createdAt ?? 0,
        icon: Send,
        iconTone: "primary",
        title: `Sent to ${inv.clientName ?? "Client"}`,
        detail: `${inv.number ?? ""} · ${formatShortDate(inv.createdAt)}`,
        amount: inv.total,
        onSelect: () => navigate("/invoices"),
      });
    }
  }

  for (const d of drafts) {
    const total =
      (d.items ?? []).reduce((s, it) => s + (it.total ?? 0), 0) || undefined;
    const when = d.updatedAt ?? d.savedAt ?? 0;
    items.push({
      id: `draft-${d.id}`,
      at: when,
      icon: FileText,
      iconTone: "muted",
      title: "Draft saved",
      detail: formatShortDate(when),
      amount: total,
      onSelect: () => navigate("/invoices"),
    });
  }

  items.sort((a, b) => b.at - a.at);
  return items;
}
