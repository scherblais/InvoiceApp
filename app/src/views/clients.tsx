import { useMemo, useState } from "react";
import {
  Calendar,
  FileText,
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
import { ClientDialog } from "@/components/clients/client-dialog";
import { eventClientId, type Client } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

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

/**
 * Stable pseudo-random accent color per client id, drawn from the same
 * palette as the calendar event dots so the whole app feels coherent.
 * Used as a tiny strip on the avatar wrapper so every card is visually
 * distinct without being loud.
 */
const ACCENT_COLORS = [
  "#7cadf0",
  "#a78bfa",
  "#6dd4a8",
  "#f5c96b",
  "#f0a0c4",
  "#5ec5c0",
  "#f4877f",
  "#818cf8",
];
function accentFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
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
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
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
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            New client
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted/40 text-muted-foreground">
                <Users className="h-6 w-6" aria-hidden />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                const accent = accentFor(c.id);
                const displayName = c.name || c.company || "Unnamed";
                const hasContact = !!c.email || !!c.phone;

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setDialog({ open: true, initial: c })}
                    className="group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-foreground/20 hover:bg-accent/30"
                  >
                    {/* Colored accent strip anchors the card to a per-client hue. */}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5"
                      style={{ backgroundColor: accent }}
                    />

                    <div className="flex flex-col gap-4 p-5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-11 w-11 shrink-0">
                          <AvatarFallback
                            className="text-sm font-semibold text-foreground/90"
                            style={{ backgroundColor: `${accent}22` }}
                          >
                            {clientInitials(c)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-semibold leading-tight">
                            {displayName}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-muted-foreground">
                            {c.company && c.name
                              ? c.company
                              : c.name && !c.company
                                ? "Individual"
                                : c.company
                                  ? "Company"
                                  : "Unnamed"}
                          </div>
                        </div>
                        {hasCustom ? <StatusBadge kind="custom" /> : null}
                      </div>

                      <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            !c.email && "opacity-40"
                          )}
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">
                            {c.email || "No email"}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex items-center gap-1.5",
                            !c.phone && "opacity-40"
                          )}
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">
                            {c.phone || "No phone"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto grid grid-cols-3 divide-x border-t bg-muted/20 text-center text-[11px] text-muted-foreground">
                      <div className="flex flex-col items-center gap-0.5 py-2.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <Calendar
                            className="h-3 w-3 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="tabular-nums">
                            {stats.eventCount}
                          </span>
                        </div>
                        <div className="uppercase tracking-wide">
                          {stats.eventCount === 1 ? "Event" : "Events"}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 py-2.5">
                        <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                          <FileText
                            className="h-3 w-3 text-muted-foreground"
                            aria-hidden
                          />
                          <span className="tabular-nums">
                            {stats.invoiceCount}
                          </span>
                          {stats.unpaidCount > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400 tabular-nums">
                              · {stats.unpaidCount}
                            </span>
                          ) : null}
                        </div>
                        <div className="uppercase tracking-wide">
                          {stats.unpaidCount > 0 ? "Unpaid" : "Invoices"}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 py-2.5">
                        <div className="text-xs font-medium text-foreground tabular-nums">
                          {stats.totalBilled > 0
                            ? formatCurrency(stats.totalBilled, 0)
                            : "—"}
                        </div>
                        <div className="uppercase tracking-wide">Billed</div>
                      </div>
                    </div>

                    {!hasContact && config ? null : null}
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
