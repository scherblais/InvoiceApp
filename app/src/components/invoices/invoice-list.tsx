import { useMemo, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  clientLabel,
  draftTotal,
  isOverdue,
  monthName,
} from "@/lib/invoice";
import type { Client, Draft, Invoice } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "all" | "drafts" | "sent" | "paid";

interface InvoiceListProps {
  invoices: Invoice[];
  drafts: Draft[];
  clients: Client[];
  onNew: () => void;
  onOpenInvoice: (id: string) => void;
  onOpenDraft: (id: string) => void;
}

export function InvoiceList({
  invoices,
  drafts,
  clients,
  onNew,
  onOpenInvoice,
  onOpenDraft,
}: InvoiceListProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const clientById = useMemo(() => {
    const m = new Map<string, Client>();
    for (const c of clients) m.set(c.id, c);
    return m;
  }, [clients]);

  const counts = useMemo(() => {
    const all = invoices.length + drafts.length;
    const sent = invoices.filter((i) => i.status !== "paid").length;
    const paid = invoices.filter((i) => i.status === "paid").length;
    return { all, drafts: drafts.length, sent, paid };
  }, [invoices, drafts]);

  const { visibleInvoices, visibleDrafts } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (text: string) => !q || text.toLowerCase().includes(q);

    let inv =
      filter === "drafts"
        ? []
        : filter === "sent"
        ? invoices.filter((i) => i.status !== "paid")
        : filter === "paid"
        ? invoices.filter((i) => i.status === "paid")
        : invoices.slice();

    inv = inv
      .filter((i) => {
        const client = i.clientId ? clientById.get(i.clientId) : null;
        const haystack = `${i.number ?? ""} ${i.clientName ?? ""} ${
          client ? clientLabel(client) : ""
        }`;
        return matches(haystack);
      })
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

    const drafts_ =
      filter === "sent" || filter === "paid"
        ? []
        : drafts
            .filter((d) => {
              const client = d.clientId ? clientById.get(d.clientId) : null;
              const haystack = client ? clientLabel(client) : "";
              return matches(haystack);
            })
            .sort((a, b) => (b.updatedAt ?? b.savedAt ?? 0) - (a.updatedAt ?? a.savedAt ?? 0));

    return { visibleInvoices: inv, visibleDrafts: drafts_ };
  }, [filter, query, invoices, drafts, clientById]);

  const isEmpty =
    visibleInvoices.length === 0 && visibleDrafts.length === 0;

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New invoice
        </Button>
      </header>

      <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-1.5 tabular-nums">
                {counts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="drafts">
              Drafts
              <Badge variant="secondary" className="ml-1.5 tabular-nums">
                {counts.drafts}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="sent">
              Unpaid
              <Badge variant="secondary" className="ml-1.5 tabular-nums">
                {counts.sent}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="paid">
              Paid
              <Badge variant="secondary" className="ml-1.5 tabular-nums">
                {counts.paid}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-full md:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client or number"
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-3 p-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10" />
            <div className="text-sm">No invoices match this filter.</div>
            <Button variant="outline" size="sm" onClick={onNew}>
              Create your first invoice
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {visibleDrafts.length > 0 ? (
              <section>
                <div className="bg-muted/40 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:px-8">
                  Drafts · {visibleDrafts.length}
                </div>
                <ul className="divide-y">
                  {visibleDrafts.map((d) => {
                    const client = d.clientId
                      ? clientById.get(d.clientId)
                      : null;
                    const total = draftTotal(d);
                    return (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => onOpenDraft(d.id)}
                          className="flex w-full items-center gap-4 px-6 py-3 text-left transition-colors hover:bg-muted/40 md:px-8"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {clientLabel(client)}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge
                                variant="outline"
                                className="h-5 px-1.5 text-[10px]"
                              >
                                Draft
                              </Badge>
                              {d.month ? <span>{monthName(d.month)}</span> : null}
                              <span>
                                {(d.items ?? []).length} item
                                {(d.items ?? []).length === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium tabular-nums">
                              {formatCurrency(total, 2)}
                            </div>
                            {d.updatedAt ? (
                              <div className="text-xs text-muted-foreground">
                                Saved {formatShortDate(d.updatedAt)}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {visibleInvoices.length > 0 ? (
              <section>
                <div className="bg-muted/40 px-6 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:px-8">
                  Invoices · {visibleInvoices.length}
                </div>
                <ul className="divide-y">
                  {visibleInvoices.map((inv) => {
                    const overdue = isOverdue(inv);
                    return (
                      <li key={inv.id}>
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(inv.id)}
                          className="flex w-full items-center gap-4 px-6 py-3 text-left transition-colors hover:bg-muted/40 md:px-8"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="truncate text-sm font-medium">
                                {inv.clientName ||
                                  clientLabel(
                                    inv.clientId
                                      ? clientById.get(inv.clientId)
                                      : undefined
                                  )}
                              </span>
                              <span className="truncate text-xs tabular-nums text-muted-foreground">
                                {inv.number}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <StatusBadge
                                status={inv.status ?? "sent"}
                                overdue={overdue}
                              />
                              {inv.month ? <span>{monthName(inv.month)}</span> : null}
                              {inv.createdAt ? (
                                <span>· {formatShortDate(inv.createdAt)}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium tabular-nums">
                              {formatCurrency(inv.total ?? 0, 2)}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  overdue,
}: {
  status: string;
  overdue: boolean;
}) {
  if (status === "paid") {
    return (
      <Badge
        variant="outline"
        className="h-5 border-emerald-500/40 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-700 dark:text-emerald-400"
      >
        Paid
      </Badge>
    );
  }
  if (overdue) {
    return (
      <Badge
        variant="outline"
        className="h-5 border-destructive/40 bg-destructive/10 px-1.5 text-[10px] text-destructive"
      >
        Overdue
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 px-1.5 text-[10px]",
        "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
      )}
    >
      Unpaid
    </Badge>
  );
}
