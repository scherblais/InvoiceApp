import { useMemo, useState } from "react";
import { ChevronDown, Mail, Percent, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Client, ClientOverrides, Config } from "@/lib/types";
import {
  DEFAULT_ADDONS,
  DEFAULT_PACKAGES,
  clientInitials,
} from "@/lib/invoice";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ClientsTabProps {
  clients: Client[];
  config: Config;
  onSave: (next: Client[]) => void;
}

interface DialogState {
  open: boolean;
  initial: Client | null;
}

/**
 * Parse the raw string from an override input. Empty / whitespace / non-numeric
 * means "use default"; anything else becomes a finite non-negative number.
 */
function parseOverride(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

function ClientFormDialog({
  state,
  config,
  onOpenChange,
  onSave,
  onDelete,
}: {
  state: DialogState;
  config: Config;
  onOpenChange: (open: boolean) => void;
  onSave: (c: Client) => void;
  onDelete?: (id: string) => void;
}) {
  const initial = state.initial;
  const packages = config.packages?.length ? config.packages : DEFAULT_PACKAGES;
  const addons = config.addons?.length ? config.addons : DEFAULT_ADDONS;

  const [name, setName] = useState(initial?.name ?? "");
  const [company, setCompany] = useState(initial?.company ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const [pkgOverrides, setPkgOverrides] = useState<Record<string, string>>(
    () => {
      const out: Record<string, string> = {};
      const src = initial?.overrides?.packages ?? {};
      for (const [id, price] of Object.entries(src)) {
        out[id] = String(price);
      }
      return out;
    }
  );
  const [addonOverrides, setAddonOverrides] = useState<Record<string, string>>(
    () => {
      const out: Record<string, string> = {};
      const src = initial?.overrides?.addons ?? {};
      for (const [id, price] of Object.entries(src)) {
        out[id] = String(price);
      }
      return out;
    }
  );

  const [discountType, setDiscountType] = useState<"%" | "$">(
    initial?.discount?.type ?? "%"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    initial?.discount?.value ? String(initial.discount.value) : ""
  );

  const hasCustom =
    Object.keys(pkgOverrides).length > 0 ||
    Object.keys(addonOverrides).length > 0 ||
    !!discountValue.trim();
  const [pricingOpen, setPricingOpen] = useState(hasCustom);

  const handleSave = () => {
    if (!name.trim() && !company.trim()) {
      setError("Enter a name or company");
      return;
    }

    const packagesOut: Record<string, number> = {};
    for (const [id, raw] of Object.entries(pkgOverrides)) {
      const n = parseOverride(raw);
      if (n !== undefined) packagesOut[id] = n;
    }
    const addonsOut: Record<string, number> = {};
    for (const [id, raw] of Object.entries(addonOverrides)) {
      const n = parseOverride(raw);
      if (n !== undefined) addonsOut[id] = n;
    }
    const overrides: ClientOverrides = {};
    if (Object.keys(packagesOut).length) overrides.packages = packagesOut;
    if (Object.keys(addonsOut).length) overrides.addons = addonsOut;

    const parsedDiscount = Number(discountValue.trim());
    const hasDiscount =
      discountValue.trim() !== "" &&
      Number.isFinite(parsedDiscount) &&
      parsedDiscount > 0;

    const client: Client = {
      id: initial?.id ?? `c_${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      ...(Object.keys(overrides).length ? { overrides } : {}),
      ...(hasDiscount
        ? {
            discount: {
              type: discountType,
              value: Math.round(parsedDiscount * 100) / 100,
            },
          }
        : {}),
    };
    onSave(client);
    onOpenChange(false);
  };

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            Use company for agencies/brokerages, or name for individuals.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-name">Name</Label>
              <Input
                id="ct-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ct-company">Company</Label>
              <Input
                id="ct-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Press Realty"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-email">Email</Label>
            <Input
              id="ct-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          {/* Custom pricing */}
          <div className="rounded-lg border bg-muted/20">
            <button
              type="button"
              onClick={() => setPricingOpen((v) => !v)}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium"
            >
              <span className="flex items-center gap-2">
                Custom pricing
                {hasCustom ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    Active
                  </span>
                ) : null}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  pricingOpen && "rotate-180"
                )}
              />
            </button>
            {pricingOpen ? (
              <div className="flex flex-col gap-4 border-t px-4 py-4">
                {/* Discount */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Discount
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Applied to the pre-tax subtotal. Taxes are then computed on
                    the discounted amount.
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="inline-flex overflow-hidden rounded-md border">
                      <button
                        type="button"
                        onClick={() => setDiscountType("%")}
                        className={cn(
                          "px-3 py-1.5 text-sm transition-colors",
                          discountType === "%"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        )}
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDiscountType("$")}
                        className={cn(
                          "border-l px-3 py-1.5 text-sm transition-colors",
                          discountType === "$"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background hover:bg-accent"
                        )}
                      >
                        $
                      </button>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      step={discountType === "%" ? "0.1" : "0.01"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder={discountType === "%" ? "10" : "25.00"}
                      className="flex-1"
                    />
                  </div>
                </div>

                {/* Package overrides */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Package prices
                  </Label>
                  <div className="flex flex-col gap-2">
                    {packages.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{p.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Default · {formatCurrency(p.price, 2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={pkgOverrides[p.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setPkgOverrides((prev) => {
                                const next = { ...prev };
                                if (v === "") delete next[p.id];
                                else next[p.id] = v;
                                return next;
                              });
                            }}
                            placeholder={String(p.price)}
                            className="h-8 w-24"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Addon overrides */}
                <div className="flex flex-col gap-2">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Add-on prices
                  </Label>
                  <div className="flex flex-col gap-2">
                    {addons.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{a.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Default · {formatCurrency(a.price, 2)}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={addonOverrides[a.id] ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              setAddonOverrides((prev) => {
                                const next = { ...prev };
                                if (v === "") delete next[a.id];
                                else next[a.id] = v;
                                return next;
                              });
                            }}
                            placeholder={String(a.price)}
                            className="h-8 w-24"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {initial && onDelete ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!initial) return;
                  if (
                    window.confirm(
                      `Delete ${
                        initial.company || initial.name || "this client"
                      }? Existing invoices are kept.`
                    )
                  ) {
                    onDelete(initial.id);
                    onOpenChange(false);
                  }
                }}
                className="text-destructive hover:text-destructive"
              >
                Delete
              </Button>
            ) : null}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {initial ? "Save changes" : "Add client"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsTab({ clients, config, onSave }: ClientsTabProps) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    initial: null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) =>
      (a.company || a.name || "").localeCompare(b.company || b.name || "")
    );
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.name, c.company, c.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [clients, query]);

  const handleSave = (next: Client) => {
    const idx = clients.findIndex((c) => c.id === next.id);
    if (idx >= 0) {
      onSave(clients.map((c) => (c.id === next.id ? next : c)));
    } else {
      onSave([...clients, next]);
    }
  };

  const handleDelete = (id: string) => {
    onSave(clients.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
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

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {query ? "No clients match your search." : "No clients yet."}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <ul className="divide-y">
            {filtered.map((c) => {
              const hasCustom =
                !!c.overrides?.packages ||
                !!c.overrides?.addons ||
                (!!c.discount && c.discount.value > 0);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setDialog({ open: true, initial: c })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {clientInitials(c)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-medium">
                          {c.company || c.name || "Unnamed"}
                        </div>
                        {hasCustom ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Custom pricing
                          </span>
                        ) : null}
                      </div>
                      {c.company && c.name ? (
                        <div className="truncate text-xs text-muted-foreground">
                          {c.name}
                        </div>
                      ) : null}
                    </div>
                    {c.email ? (
                      <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {dialog.open ? (
        <ClientFormDialog
          key={dialog.initial?.id ?? "new"}
          state={dialog}
          config={config}
          onOpenChange={(open) =>
            setDialog(open ? dialog : { open: false, initial: null })
          }
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}
