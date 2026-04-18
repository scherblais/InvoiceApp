import { useMemo, useState } from "react";
import { FileText, Mail, Phone, Plus, Search, Users } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClientDialog } from "@/components/clients/client-dialog";
import { eventClientId, type Client } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

function clientInitials(c: Client): string {
  const source = c.name || c.company || "";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface ClientStats {
  eventCount: number;
  invoiceCount: number;
  unpaidCount: number;
  totalBilled: number;
}

export function ClientsView() {
  const { clients, calEvents, invoices, config, saveClients } = useData();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<
    | { open: false }
    | { open: true; initial: Client | null }
  >({ open: false });

  const statsById = useMemo(() => {
    const map = new Map<string, ClientStats>();
    const ensure = (id: string): ClientStats => {
      let s = map.get(id);
      if (!s) {
        s = { eventCount: 0, invoiceCount: 0, unpaidCount: 0, totalBilled: 0 };
        map.set(id, s);
      }
      return s;
    };
    for (const ev of calEvents) {
      const cid = eventClientId(ev);
      if (!cid) continue;
      ensure(cid).eventCount++;
    }
    for (const inv of invoices) {
      if (!inv.clientId) continue;
      const s = ensure(inv.clientId);
      s.invoiceCount++;
      s.totalBilled += inv.total ?? 0;
      if (inv.status !== "paid") s.unpaidCount++;
    }
    return map;
  }, [calEvents, invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = clients.filter((c): c is Client => !!c && !!c.id);
    const sorted = [...list].sort((a, b) =>
      (a.name || a.company || "").localeCompare(b.name || b.company || "")
    );
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.name, c.company, c.email, c.phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [clients, query]);

  const handleSave = (next: Client) => {
    const idx = clients.findIndex((c) => c.id === next.id);
    if (idx >= 0) {
      saveClients(clients.map((c) => (c.id === next.id ? next : c)));
    } else {
      saveClients([...clients, next]);
    }
  };

  const handleDelete = (id: string) => {
    saveClients(clients.filter((c) => c.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex flex-col justify-center gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Clients</h1>
          <p className="text-xs text-muted-foreground">
            {clients.length} {clients.length === 1 ? "client" : "clients"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients"
              className="pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setDialog({ open: true, initial: null })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New client
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {query ? "No clients match your search" : "No clients yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "Try a different name, company, or email."
                    : "Add a client to invoice them and schedule shoots."}
                </p>
              </div>
              {!query ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ open: true, initial: null })}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add your first client
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((c) => {
                const stats = statsById.get(c.id) ?? {
                  eventCount: 0,
                  invoiceCount: 0,
                  unpaidCount: 0,
                  totalBilled: 0,
                };
                const hasCustom =
                  !!c.overrides?.packages ||
                  !!c.overrides?.addons ||
                  (!!c.discount && c.discount.value > 0);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDialog({ open: true, initial: c })}
                    className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {clientInitials(c)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <div className="truncate text-sm font-semibold">
                            {c.name || c.company || "Unnamed"}
                          </div>
                        </div>
                        {c.company && c.name ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {c.company}
                          </div>
                        ) : null}
                      </div>
                      {hasCustom ? <StatusBadge kind="custom" /> : null}
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {c.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.email}</span>
                        </div>
                      ) : null}
                      {c.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{c.phone}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>
                          {stats.eventCount}{" "}
                          {stats.eventCount === 1 ? "event" : "events"}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {stats.invoiceCount}
                          {stats.unpaidCount > 0
                            ? ` · ${stats.unpaidCount} unpaid`
                            : ""}
                        </span>
                      </div>
                      {stats.totalBilled > 0 ? (
                        <span className="tabular-nums font-medium">
                          {formatCurrency(stats.totalBilled, 0)}
                        </span>
                      ) : (
                        <span className="opacity-0 transition-opacity group-hover:opacity-100">
                          Edit →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ClientDialog
        open={dialog.open}
        onOpenChange={(open) =>
          setDialog(open ? { open: true, initial: null } : { open: false })
        }
        initial={dialog.open ? dialog.initial : null}
        config={config}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
