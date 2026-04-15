import { useEffect, useState } from "react";
import { ChevronDown, Copy, Link as LinkIcon, Percent } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { clientShareLink } from "@/lib/shared";
import { DEFAULT_ADDONS, DEFAULT_PACKAGES } from "@/lib/invoice";
import { formatCurrency } from "@/lib/format";
import type { Client, ClientOverrides, Config } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Client | null;
  config: Config;
  onSave: (client: Client) => void;
  onDelete?: (id: string) => void;
}

function parseOverride(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100) / 100;
}

export function ClientDialog({
  open,
  onOpenChange,
  initial,
  config,
  onSave,
  onDelete,
}: ClientDialogProps) {
  const { user } = useAuth();
  const packages = config.packages?.length ? config.packages : DEFAULT_PACKAGES;
  const addons = config.addons?.length ? config.addons : DEFAULT_ADDONS;

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [pkgOverrides, setPkgOverrides] = useState<Record<string, string>>({});
  const [addonOverrides, setAddonOverrides] = useState<Record<string, string>>(
    {}
  );
  const [discountType, setDiscountType] = useState<"%" | "$">("%");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [pricingOpen, setPricingOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate form every time the dialog opens or target client changes.
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCompany(initial?.company ?? "");
    setEmail(initial?.email ?? "");
    setPhone(initial?.phone ?? "");
    setNotes(initial?.notes ?? "");

    const pkgs: Record<string, string> = {};
    for (const [id, price] of Object.entries(initial?.overrides?.packages ?? {})) {
      pkgs[id] = String(price);
    }
    setPkgOverrides(pkgs);

    const adds: Record<string, string> = {};
    for (const [id, price] of Object.entries(initial?.overrides?.addons ?? {})) {
      adds[id] = String(price);
    }
    setAddonOverrides(adds);

    setDiscountType(initial?.discount?.type ?? "%");
    setDiscountValue(
      initial?.discount?.value ? String(initial.discount.value) : ""
    );

    const hasCustom =
      Object.keys(pkgs).length > 0 ||
      Object.keys(adds).length > 0 ||
      !!(initial?.discount?.value && initial.discount.value > 0);
    setPricingOpen(hasCustom);

    setError(null);
  }, [open, initial]);

  const shareLink =
    initial && user ? clientShareLink(user.uid, initial.id) : "";

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

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
      phone: phone.trim(),
      notes: notes.trim(),
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

  const handleDelete = () => {
    if (!initial?.id || !onDelete) return;
    const label = initial.company || initial.name || "this client";
    if (
      window.confirm(
        `Delete ${label}? Existing invoices and events are kept.`
      )
    ) {
      onDelete(initial.id);
      onOpenChange(false);
    }
  };

  const hasCustom =
    Object.keys(pkgOverrides).length > 0 ||
    Object.keys(addonOverrides).length > 0 ||
    !!discountValue.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit client" : "New client"}</DialogTitle>
          <DialogDescription>
            Clients are the people and agencies you invoice and schedule shoots
            for.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cd-name">Name</Label>
              <Input
                id="cd-name"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cd-company">Company</Label>
              <Input
                id="cd-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Press Realty"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cd-email">Email</Label>
              <Input
                id="cd-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cd-phone">Phone</Label>
              <Input
                id="cd-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(514) 555-0123"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cd-notes">Notes</Label>
            <Textarea
              id="cd-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Preferences, referral source, etc."
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
                    Applied to the pre-tax subtotal. Taxes compute on the
                    discounted amount.
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
                          <span className="text-xs text-muted-foreground">$</span>
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
                          <span className="text-xs text-muted-foreground">$</span>
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

          {shareLink ? (
            <div className="flex flex-col gap-1.5 border-t pt-3">
              <Label className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                <LinkIcon className="h-3 w-3" />
                Share link
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={shareLink}
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  aria-label="Copy share link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Public page showing live status of this client's shoots.
              </p>
            </div>
          ) : null}

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
                onClick={handleDelete}
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
