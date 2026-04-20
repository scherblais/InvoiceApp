import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckCircle2,
  CircleDashed,
  FileText,
  PenLine,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { KbdSequence } from "@/components/ui/kbd";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { formatCurrency, formatShortDate } from "@/lib/format";
import {
  clientLabel,
  draftTotal,
  isOverdue,
  monthName,
} from "@/lib/invoice";
import type { Client, Draft, Invoice } from "@/lib/types";

type Filter = "all" | "drafts" | "sent" | "paid";

interface InvoiceListProps {
  invoices: Invoice[];
  drafts: Draft[];
  clients: Client[];
  onNew: () => void;
  onOpenInvoice: (id: string) => void;
  onOpenDraft: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onDeleteInvoice: (id: string) => void;
  onDeleteDraft: (id: string) => void;
}

// URL param ↔ internal filter name. Keeps the sidebar using friendly
// URLs (?status=unpaid) while the list component still thinks in
// terms of its internal "sent" bucket (historically named after the
// status value stored on invoices).
const STATUS_TO_FILTER: Record<string, Filter> = {
  drafts: "drafts",
  unpaid: "sent",
  paid: "paid",
  all: "all",
};
const FILTER_TO_STATUS: Record<Filter, string | null> = {
  all: null,
  drafts: "drafts",
  sent: "unpaid",
  paid: "paid",
};

export function InvoiceList({
  invoices,
  drafts,
  clients,
  onNew,
  onOpenInvoice,
  onOpenDraft,
  onToggleStatus,
  onDeleteInvoice,
  onDeleteDraft,
}: InvoiceListProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusParam = searchParams.get("status");
  const filter: Filter =
    (statusParam && STATUS_TO_FILTER[statusParam]) || "all";
  const setFilter = (next: Filter) => {
    const nextParams = new URLSearchParams(searchParams);
    const value = FILTER_TO_STATUS[next];
    if (value) nextParams.set("status", value);
    else nextParams.delete("status");
    setSearchParams(nextParams, { replace: true });
  };
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
      <PageHeader
        title="Invoices"
        subtitle={`${counts.all} total · ${counts.sent} unpaid · ${counts.drafts} draft${counts.drafts === 1 ? "" : "s"}`}
        actions={
          <Button size="sm" onClick={onNew} className="gap-1.5">
            <Plus className="h-4 w-4" aria-hidden />
            New invoice
          </Button>
        }
      />

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
            className="pl-8 pr-14"
          />
          {/* Advertise the global ⌘K palette for broader searches. */}
          <KbdSequence
            keys="⌘K"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
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
              <section aria-label="Drafts">
                <h2 className="bg-muted/40 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:px-8">
                  Drafts · {visibleDrafts.length}
                </h2>
                <ul className="divide-y">
                  {visibleDrafts.map((d) => {
                    const client = d.clientId
                      ? clientById.get(d.clientId)
                      : null;
                    const total = draftTotal(d);
                    return (
                      <li key={d.id}>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onOpenDraft(d.id)}
                              className="relative flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30 before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-transparent before:transition-colors hover:before:bg-foreground/30 md:px-8"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">
                                  {clientLabel(client)}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                  <StatusBadge kind="draft" />
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
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onSelect={() => onOpenDraft(d.id)}>
                              <PenLine />
                              <span>Open draft</span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              variant="destructive"
                              onSelect={() => onDeleteDraft(d.id)}
                            >
                              <Trash2 />
                              <span>Delete draft</span>
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {visibleInvoices.length > 0 ? (
              <section aria-label="Invoices">
                <h2 className="bg-muted/40 px-6 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:px-8">
                  Invoices · {visibleInvoices.length}
                </h2>
                <ul className="divide-y">
                  {visibleInvoices.map((inv) => {
                    const overdue = isOverdue(inv);
                    const paid = inv.status === "paid";
                    return (
                      <li key={inv.id}>
                        <ContextMenu>
                          <ContextMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onOpenInvoice(inv.id)}
                              className="relative flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30 before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-transparent before:transition-colors hover:before:bg-foreground/30 md:px-8"
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
                                    kind={
                                      paid
                                        ? "paid"
                                        : overdue
                                          ? "overdue"
                                          : "unpaid"
                                    }
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
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onSelect={() => onOpenInvoice(inv.id)}>
                              <PenLine />
                              <span>Open invoice</span>
                            </ContextMenuItem>
                            <ContextMenuItem onSelect={() => onToggleStatus(inv.id)}>
                              {paid ? <CircleDashed /> : <CheckCircle2 />}
                              <span>
                                {paid ? "Mark as unpaid" : "Mark as paid"}
                              </span>
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                              variant="destructive"
                              onSelect={() => onDeleteInvoice(inv.id)}
                            >
                              <Trash2 />
                              <span>Delete invoice</span>
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
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

