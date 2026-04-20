import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type StatusKind } from "@/components/ui/status-badge";
import { formatCurrency, formatShortDate } from "@/lib/format";
import type { Invoice, Draft, Client } from "@/lib/types";

interface AttentionPanelProps {
  invoices: Invoice[];
  drafts: Draft[];
  clients: Client[];
}

interface AttentionItem {
  id: string;
  kind: "draft" | "unpaid" | "overdue";
  title: string;
  meta: string;
  total: number;
  onSelect: () => void;
}

export function AttentionPanel({
  invoices,
  drafts,
  clients,
}: AttentionPanelProps) {
  const navigate = useNavigate();
  const now = Date.now();

  const items: AttentionItem[] = [];

  for (const d of drafts) {
    const client = clients.find((c) => c.id === d.clientId);
    const total = (d.items ?? []).reduce((s, it) => s + (it.total ?? 0), 0);
    items.push({
      id: `draft-${d.id}`,
      kind: "draft",
      title: client?.company ?? client?.name ?? "(no client)",
      meta: `Draft · ${formatShortDate(d.updatedAt ?? d.savedAt)}`,
      total,
      onSelect: () => navigate("/invoices"),
    });
  }

  for (const inv of invoices.filter((i) => i.status !== "paid")) {
    const daysSent = inv.createdAt
      ? Math.floor((now - inv.createdAt) / (1000 * 60 * 60 * 24))
      : 0;
    items.push({
      id: `inv-${inv.id}`,
      kind: daysSent > 30 ? "overdue" : "unpaid",
      title: inv.clientName ?? "(no client)",
      meta: `Sent ${formatShortDate(inv.createdAt)}${
        daysSent > 0 ? ` · ${daysSent}d ago` : ""
      }`,
      total: inv.total ?? 0,
      onSelect: () => navigate("/invoices"),
    });
  }

  items.sort((a, b) => {
    const rank = { draft: 0, overdue: 1, unpaid: 2 };
    return rank[a.kind] - rank[b.kind];
  });

  const visible = items.slice(0, 6);

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-row items-center justify-between border-b py-5 pb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="h-3.5 w-3.5 text-muted-foreground"
            aria-hidden
          />
          <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
          {items.length > 0 ? (
            <Badge variant="secondary" className="rounded-full">
              {items.length}
            </Badge>
          ) : null}
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={() => navigate("/invoices")}
            className="group inline-flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            See all
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </button>
        ) : null}
      </CardHeader>
      <CardContent className="p-0">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <CheckCircle2
              className="h-8 w-8 text-muted-foreground/60"
              aria-hidden
            />
            <span>All caught up</span>
          </div>
        ) : (
          <ul className="divide-y">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={item.onSelect}
                  className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {item.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.meta}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium tabular-nums">
                      {formatCurrency(item.total, 2)}
                    </div>
                    <StatusBadge kind={item.kind as StatusKind} />
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
