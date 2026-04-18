import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { clientLabel, isOverdue, monthName } from "@/lib/invoice";
import type { Client, Invoice } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";

interface InvoiceDocumentProps {
  invoice: Invoice & { items?: InvoiceItem[]; notes?: string };
  client?: Client | null;
  /** When true, the status badge is suppressed — the invoice hasn't been
   *  issued yet so "Unpaid / Overdue" labels would be misleading. */
  draft?: boolean;
}

/**
 * The visual invoice document (header, bill-to, line items, totals, notes).
 * Shared between the post-send `InvoicePreview` and the pre-send review step
 * in `InvoiceEditor` so both render exactly what the client will see.
 */
export function InvoiceDocument({
  invoice,
  client,
  draft = false,
}: InvoiceDocumentProps) {
  const items: InvoiceItem[] = invoice.items ?? [];
  const overdue = !draft && isOverdue(invoice);
  const paid = !draft && invoice.status === "paid";

  return (
    <article className="mx-auto max-w-3xl bg-background p-8 text-sm print:p-0">
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
            {draft ? null : (
              <StatusBadge
                kind={paid ? "paid" : overdue ? "overdue" : "unpaid"}
                size="md"
              />
            )}
            <span>
              {invoice.createdAt
                ? formatLongDate(new Date(invoice.createdAt))
                : formatLongDate()}
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
  );
}
