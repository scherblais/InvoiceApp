import { ArrowLeft, Check, Pencil, Printer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { clientLabel, isOverdue, monthName } from "@/lib/invoice";
import type { Client, Invoice } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";

interface InvoicePreviewProps {
  invoice: Invoice & { items?: InvoiceItem[]; notes?: string };
  client?: Client | null;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}

export function InvoicePreview({
  invoice,
  client,
  onBack,
  onEdit,
  onDelete,
  onToggleStatus,
}: InvoicePreviewProps) {
  const items: InvoiceItem[] = invoice.items ?? [];
  const overdue = isOverdue(invoice);
  const paid = invoice.status === "paid";

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8 print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              {invoice.number}
            </h1>
            <div className="text-xs text-muted-foreground">
              {invoice.clientName ?? clientLabel(client)}
              {invoice.month ? ` · ${monthName(invoice.month)}` : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={paid ? "outline" : "default"}
            size="sm"
            onClick={onToggleStatus}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {paid ? "Mark as unpaid" : "Mark as paid"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print / PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/30 p-6 print:bg-transparent print:p-0">
        <article className="mx-auto max-w-3xl bg-background p-8 text-sm shadow-sm print:p-0 print:shadow-none">
          {/* Header */}
          <div className="flex flex-col gap-6 border-b pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-lg font-semibold tracking-tight">
                Lumeria Media
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Real estate photography
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">
                {invoice.number}
              </div>
              <div className="mt-1 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                {paid ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    Paid
                  </Badge>
                ) : overdue ? (
                  <Badge
                    variant="outline"
                    className="border-destructive/40 bg-destructive/10 text-destructive"
                  >
                    Overdue
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    Unpaid
                  </Badge>
                )}
                <span>
                  {invoice.createdAt
                    ? formatLongDate(new Date(invoice.createdAt))
                    : ""}
                </span>
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="grid grid-cols-1 gap-6 border-b py-6 md:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Billed to
              </div>
              <div className="mt-2 text-sm font-medium">
                {invoice.clientName ?? clientLabel(client)}
              </div>
              {client?.email ? (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {client.email}
                </div>
              ) : null}
            </div>
            <div className="md:text-right">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Billing period
              </div>
              <div className="mt-2 text-sm font-medium">
                {invoice.month ? monthName(invoice.month) : "—"}
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="py-6">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2 pr-4">Listing</th>
                  <th className="pb-2 pr-4 text-right">Subtotal</th>
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, idx) => (
                  <tr key={idx} className="align-top">
                    <td className="py-3 pr-4">
                      <div className="font-medium">
                        {item.address || "Listing"}
                        {item.unit ? `, Apt ${item.unit}` : ""}
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {item.pkg?.name ? (
                          <div>
                            {item.pkg.name}
                            {item.pkgAmount
                              ? ` · ${formatCurrency(item.pkgAmount, 2)}`
                              : ""}
                          </div>
                        ) : null}
                        {item.extrasQty ? (
                          <div>
                            {item.extrasQty} × {item.pkg?.extraLabel ?? "extra"}
                            {item.extrasAmount
                              ? ` · ${formatCurrency(item.extrasAmount, 2)}`
                              : ""}
                          </div>
                        ) : null}
                        {(item.addons ?? []).length > 0
                          ? item.addons!.map((a, i) => (
                              <div key={i}>
                                {a.name}
                                {a.count && a.count > 1 ? ` × ${a.count}` : ""}
                                {a.totalPrice
                                  ? ` · ${formatCurrency(a.totalPrice, 2)}`
                                  : ""}
                              </div>
                            ))
                          : null}
                        {item.travel?.fee ? (
                          <div>
                            Travel ({item.travel.distance.toFixed(1)} km) ·{" "}
                            {formatCurrency(item.travel.fee, 2)}
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {formatCurrency(item.subtotal ?? 0, 2)}
                    </td>
                    <td className="py-3 text-right tabular-nums">
                      {formatCurrency(item.total ?? 0, 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end border-t pt-6">
            <dl className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <dt>Subtotal</dt>
                <dd className="tabular-nums">
                  {formatCurrency(
                    invoice.subtotal ??
                      items.reduce((s, i) => s + (i.subtotal ?? 0), 0),
                    2
                  )}
                </dd>
              </div>
              {invoice.discount && invoice.discount > 0 ? (
                <div className="flex justify-between text-muted-foreground">
                  <dt>
                    Discount
                    {invoice.discountInfo
                      ? ` (${invoice.discountInfo.value}${invoice.discountInfo.type})`
                      : ""}
                  </dt>
                  <dd className="tabular-nums">
                    −{formatCurrency(invoice.discount, 2)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between text-muted-foreground">
                <dt>GST (5%)</dt>
                <dd className="tabular-nums">
                  {formatCurrency(invoice.totalGst ?? 0, 2)}
                </dd>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <dt>QST (9.975%)</dt>
                <dd className="tabular-nums">
                  {formatCurrency(invoice.totalQst ?? 0, 2)}
                </dd>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">
                  {formatCurrency(invoice.total ?? 0, 2)}
                </dd>
              </div>
            </dl>
          </div>

          {invoice.notes ? (
            <div className="mt-6 border-t pt-6 text-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </div>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
                {invoice.notes}
              </p>
            </div>
          ) : null}

          <div className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
            Thank you for your business · {invoice.number}
          </div>
        </article>
      </div>
    </div>
  );
}
