import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, Plus, Send, Trash2 } from "lucide-react";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import {
  DEFAULT_ADDONS,
  DEFAULT_PACKAGES,
  autoInvoiceNumber,
  clientLabel,
  computeInvoiceTotals,
  computeItemTotals,
  resolveAddonPrice,
  resolveAddons,
  resolvePackagePrice,
  resolvePackages,
  type InvoiceItem,
} from "@/lib/invoice";
import type { Client, Config, Draft, Invoice } from "@/lib/types";
import { ListingCard } from "@/components/invoices/listing-card";

type SourceRecord = (Invoice | Draft) & {
  items?: InvoiceItem[];
  notes?: string;
  number?: string;
};

interface InvoiceEditorProps {
  source?: SourceRecord | null;
  isDraft?: boolean; // true if source is a draft or brand-new
  clients: Client[];
  invoices: Invoice[];
  config: Config;
  onBack: () => void;
  onSaveDraft: (draft: Draft) => void;
  onDeleteDraft?: (id: string) => void;
  onSend: (invoice: Invoice) => void;
  onNewClient: () => void;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function InvoiceEditor({
  source,
  isDraft = true,
  clients,
  invoices,
  config,
  onBack,
  onSaveDraft,
  onDeleteDraft,
  onSend,
  onNewClient,
}: InvoiceEditorProps) {
  const [clientId, setClientId] = useState<string>(source?.clientId ?? "");
  const [month, setMonth] = useState<string>(source?.month ?? thisMonth());
  const [items, setItems] = useState<InvoiceItem[]>(
    source?.items?.map(computeItemTotals) ?? []
  );
  const [notes, setNotes] = useState<string>(
    (source as { notes?: string })?.notes ?? ""
  );
  const [numberManual, setNumberManual] = useState(false);
  const [number, setNumber] = useState<string>(
    (source as Invoice)?.number ?? ""
  );

  const client = clients.find((c) => c.id === clientId) ?? null;

  // Resolve packages/addons against the current client's overrides so the
  // listing UI, dropdowns, and snapshot prices match what will actually be
  // charged.
  const basePackages = config.packages?.length
    ? config.packages
    : DEFAULT_PACKAGES;
  const baseAddons = config.addons?.length ? config.addons : DEFAULT_ADDONS;
  const resolvedPackages = useMemo(
    () => resolvePackages(basePackages, client),
    [basePackages, client]
  );
  const resolvedAddons = useMemo(
    () => resolveAddons(baseAddons, client),
    [baseAddons, client]
  );

  // When the selected client changes, re-snapshot item prices so packages and
  // add-ons reflect the new client's overrides. Keeps quantity/selections but
  // refreshes prices.
  useEffect(() => {
    setItems((prev) =>
      prev.map((it) => {
        let next: InvoiceItem = it;
        if (it.pkg) {
          const base = basePackages.find((p) => p.id === it.pkg!.id);
          if (base) {
            next = {
              ...next,
              pkg: { ...it.pkg, price: resolvePackagePrice(base, client) },
            };
          }
        }
        if (it.addons?.length) {
          next = {
            ...next,
            addons: it.addons.map((a) => {
              const base = baseAddons.find((x) => x.id === a.id);
              if (!base) return a;
              const price = resolveAddonPrice(base, client);
              const count = a.count ?? 1;
              return {
                ...a,
                price,
                totalPrice: Math.round(price * count * 100) / 100,
              };
            }),
          };
        }
        return computeItemTotals(next);
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  // Auto invoice number when client/month change (unless user edited manually
  // or we're editing an already-issued invoice).
  const isEditingIssued = !isDraft && !!(source as Invoice)?.number;
  useEffect(() => {
    if (numberManual || isEditingIssued) return;
    setNumber(autoInvoiceNumber(client, month, invoices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, month]);

  const totals = useMemo(
    () => computeInvoiceTotals(items, client),
    [items, client]
  );

  // Autosave draft (debounced)
  useEffect(() => {
    if (isEditingIssued) return;
    const id = source?.id ?? `d_${Date.now()}`;
    const t = window.setTimeout(() => {
      const draft: Draft & { items?: InvoiceItem[]; notes?: string } = {
        id,
        clientId,
        month,
        items: items.map(computeItemTotals),
        notes,
        updatedAt: Date.now(),
        savedAt: (source as Draft)?.savedAt ?? Date.now(),
      };
      onSaveDraft(draft);
    }, 1200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, month, items, notes]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      computeItemTotals({
        address: "",
        unit: "",
        pkg: undefined,
        extrasQty: 0,
        addons: [],
        travel: { distance: 0, fee: 0, calculated: false },
      }),
    ]);
  }, []);

  const updateItem = (idx: number, next: InvoiceItem) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? computeItemTotals(next) : it))
    );
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSend =
    !!clientId &&
    items.length > 0 &&
    items.every((i) => !!i.pkg && !!i.address?.trim());

  const [reviewing, setReviewing] = useState(false);

  // Build the same invoice shape the `onSend` callback expects. Used both for
  // the review preview (so the user sees exactly what will be committed) and
  // the actual send call. Discount is snapshotted so historical records stay
  // correct even if the client's configured discount later changes.
  const buildInvoice = useCallback((): Invoice & {
    items?: InvoiceItem[];
    notes?: string;
    issueDate?: string;
    monthName?: string;
    discount?: number;
    discountInfo?: { type: "%" | "$"; value: number };
  } => {
    const now = Date.now();
    return {
      id: isEditingIssued ? (source as Invoice).id : `inv_${now}`,
      number,
      clientId,
      clientName: clientLabel(client),
      month,
      monthName: month,
      issueDate: new Date().toISOString().slice(0, 10),
      status: (source as Invoice)?.status ?? "sent",
      createdAt: (source as Invoice)?.createdAt ?? now,
      items: items.map(computeItemTotals),
      notes,
      subtotal: totals.subtotal,
      totalGst: totals.totalGst,
      totalQst: totals.totalQst,
      total: totals.total,
      ...(totals.discount > 0
        ? {
            discount: totals.discount,
            discountInfo: totals.discountInfo,
          }
        : {}),
    };
  }, [
    clientId,
    client,
    items,
    month,
    notes,
    number,
    totals,
    isEditingIssued,
    source,
  ]);

  const handleReview = () => {
    if (!canSend) return;
    setReviewing(true);
  };

  const handleConfirmSend = () => {
    onSend(buildInvoice());
  };

  const [confirmDeleteDraftOpen, setConfirmDeleteDraftOpen] = useState(false);

  const handleDeleteDraft = () => {
    if (!source?.id || !onDeleteDraft) return;
    setConfirmDeleteDraftOpen(true);
  };

  const confirmDeleteDraft = () => {
    if (!source?.id || !onDeleteDraft) return;
    onDeleteDraft(source.id);
    setConfirmDeleteDraftOpen(false);
  };

  if (reviewing) {
    const previewInvoice = buildInvoice();
    return (
      <div className="flex h-full flex-col">
        <header className="app-header flex flex-col justify-center gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setReviewing(false)}
              aria-label="Back to editing"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold tracking-tight">
                Review invoice
              </h1>
              <p className="text-xs text-muted-foreground">
                This is exactly what the client will see. Nothing has been
                sent yet.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewing(false)}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back to edit
            </Button>
            <Button size="sm" onClick={handleConfirmSend}>
              <Send className="mr-1.5 h-4 w-4" />
              {isEditingIssued ? "Save invoice" : "Confirm & send"}
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
          <InvoiceDocument
            invoice={previewInvoice}
            client={client}
            draft={!isEditingIssued}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex flex-col justify-center gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to invoices"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              {isEditingIssued ? "Edit invoice" : "New invoice"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isEditingIssued
                ? "Changes save when you click Save"
                : "Draft saves automatically"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && source?.id && onDeleteDraft ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteDraft}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete draft
            </Button>
          ) : null}
          <Button size="sm" onClick={handleReview} disabled={!canSend}>
            <Eye className="mr-1.5 h-4 w-4" />
            {isEditingIssued ? "Review changes" : "Review & send"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {/* Meta section */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <div className="flex gap-2">
                <Select value={clientId || undefined} onValueChange={setClientId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.length === 0 ? (
                      <div className="px-2 py-2 text-sm text-muted-foreground">
                        No clients yet
                      </div>
                    ) : (
                      clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {clientLabel(c)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onNewClient}
                  aria-label="New client"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {client?.overrides || (client?.discount && client.discount.value > 0) ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Custom pricing applies
                  {client?.discount && client.discount.value > 0
                    ? ` · ${client.discount.value}${client.discount.type} discount`
                    : ""}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-month">Billing month</Label>
              <Input
                id="invoice-month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invoice-number">Invoice number</Label>
              <Input
                id="invoice-number"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value);
                  setNumberManual(true);
                }}
              />
            </div>
          </section>

          {/* Items */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Listings</h2>
            {items.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <span>No listings yet.</span>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  Add your first listing
                </Button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {items.map((item, idx) => (
                    <ListingCard
                      key={idx}
                      item={item}
                      index={idx}
                      packages={resolvedPackages}
                      addons={resolvedAddons}
                      travel={config.travel}
                      onChange={(next) => updateItem(idx, next)}
                      onRemove={() => removeItem(idx)}
                    />
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="self-start"
                >
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                  Add another listing
                </Button>
              </>
            )}
          </section>

          {/* Notes */}
          <section className="flex flex-col gap-1.5">
            <Label htmlFor="invoice-notes">Notes</Label>
            <Textarea
              id="invoice-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Payment terms, delivery notes, etc."
            />
          </section>

          {/* Totals */}
          <section className="flex justify-end">
            <dl className="w-full max-w-xs space-y-1.5 rounded-lg border bg-card p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">
                  {formatCurrency(totals.subtotal, 2)}
                </dd>
              </div>
              {totals.discount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <dt>
                    Discount
                    {totals.discountInfo
                      ? ` (${totals.discountInfo.value}${totals.discountInfo.type})`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatCurrency(totals.discount, 2)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between text-muted-foreground">
                <dt>GST (5%)</dt>
                <dd className="tabular-nums">
                  {formatCurrency(totals.totalGst, 2)}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>QST (9.975%)</dt>
                <dd className="tabular-nums">
                  {formatCurrency(totals.totalQst, 2)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatCurrency(totals.total, 2)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDeleteDraftOpen}
        onOpenChange={setConfirmDeleteDraftOpen}
        title="Delete this draft?"
        description="The draft will be discarded permanently."
        confirmLabel="Delete draft"
        destructive
        onConfirm={confirmDeleteDraft}
      />
    </div>
  );
}
