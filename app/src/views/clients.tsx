import { useMemo, useState } from "react";
import {
  ChevronRight,
  Mail,
  Phone,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { KbdSequence } from "@/components/ui/kbd";
import { ClientDialog } from "@/components/clients/client-dialog";
import { eventClientId, type Client } from "@/lib/types";
import { clientColor, COLOR_DOT } from "@/lib/calendar";
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

  const activeCount = clients.filter((c) => !!c && !!c.id).length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Clients"
        subtitle={`${activeCount} ${activeCount === 1 ? "client" : "clients"}`}
        actions={
          <Button
            size="sm"
            onClick={() => setDialog({ open: true, initial: null })}
            className="w-full md:w-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New client
          </Button>
        }
      />

      <div className="flex items-center border-b px-6 py-3 md:px-8">
        <div className="relative w-full md:max-w-sm">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, email, or phone"
            className="pl-8 pr-14"
          />
          <KbdSequence
            keys="⌘K"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="mx-auto mt-12 flex max-w-md flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
              <Users className="h-5 w-5" aria-hidden />
            </div>
            <div className="flex flex-col gap-1">
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
                onClick={() => setDialog({ open: true, initial: null })}
              >
                <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
                Add your first client
              </Button>
            ) : null}
          </div>
        ) : (
          <ul className="divide-y">
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
              const primary = c.name || c.company || "Unnamed";
              const secondary = c.name && c.company ? c.company : "";

              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, initial: c })}
                    className="group relative flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30 before:absolute before:left-0 before:top-1/2 before:h-8 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-transparent before:transition-colors hover:before:bg-foreground/30 md:px-8"
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback
                        className="text-[11px] font-semibold text-foreground/90"
                        style={{
                          backgroundColor: `${COLOR_DOT[clientColor(c)]}33`,
                        }}
                      >
                        {clientInitials(c)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Primary column: name + contact (hidden on narrow
                        screens to keep the row from wrapping). */}
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {primary}
                        </span>
                        {hasCustom ? <StatusBadge kind="custom" /> : null}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {secondary ? (
                          <span className="truncate">{secondary}</span>
                        ) : null}
                        {c.email ? (
                          <span className="flex min-w-0 items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" aria-hidden />
                            <span className="truncate">{c.email}</span>
                          </span>
                        ) : null}
                        {c.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" aria-hidden />
                            <span>{c.phone}</span>
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Stats column: hidden below sm to keep the row clean
                        on phones, where the primary column carries enough. */}
                    <div className="hidden shrink-0 items-center gap-5 text-xs text-muted-foreground sm:flex">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-sm font-medium text-foreground tabular-nums">
                          {stats.totalBilled > 0
                            ? formatCurrency(stats.totalBilled, 0)
                            : "—"}
                        </span>
                        <span className="text-[11px]">
                          {stats.invoiceCount}{" "}
                          {stats.invoiceCount === 1 ? "invoice" : "invoices"}
                          {stats.unpaidCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">
                              {" "}
                              · {stats.unpaidCount} unpaid
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </div>

                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                      aria-hidden
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
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
