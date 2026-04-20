import { LumeriaLogo } from "@/components/lumeria-logo";
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

/** Reusable uppercase section label — small caps / tracking pattern
 *  used across every block of the invoice. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * The visual invoice document (header, bill-to, line items, totals,
 * notes). Shared between the post-send preview and the pre-send
 * review, so both render exactly what the client will see. Typography
 * is tuned for an editorial / premium feel — confident but quiet, with
 * every vertical rhythm coming off a small number of type sizes.
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
    <article className="mx-auto max-w-3xl rounded-xl border bg-card p-10 text-[13.5px] leading-relaxed shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {/* Header */}
      <div className="flex flex-col gap-6 border-b pb-8 md:flex-row md:items-start md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground text-background">
            <LumeriaLogo className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <div className="text-[15px] font-semibold tracking-tight">
              Lumeria Media
            </div>
            <div className="text-xs text-muted-foreground">
              Real estate photography
            </div>
          </div>
        </div>
        <div className="md:text-right">
          <SectionLabel>Invoice</SectionLabel>
          <div className="mt-1 font-mono text-[22px] font-semibold tracking-tight tabular-nums">
            {invoice.number}
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground md:justify-end">
            {draft ? null : (
              <StatusBadge
                kind={paid ? "paid" : overdue ? "overdue" : "unpaid"}
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
      <div className="grid grid-cols-1 gap-8 border-b py-8 md:grid-cols-2">
        <div>
          <SectionLabel>Billed to</SectionLabel>
          <div className="mt-2 text-[15px] font-medium tracking-tight">
            {invoice.clientName ?? clientLabel(client)}
          </div>
          {client?.email ? (
            <div className="mt-0.5 text-xs text-muted-foreground">
              {client.email}
            </div>
          ) : null}
          {client?.phone ? (
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {client.phone}
            </div>
          ) : null}
        </div>
        <div className="md:text-right">
          <SectionLabel>Billing period</SectionLabel>
          <div className="mt-2 text-[15px] font-medium tracking-tight">
            {invoice.month ? monthName(invoice.month) : "—"}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="py-8">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="pb-3 pr-4 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Listing
              </th>
              <th className="pb-3 pr-4 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Subtotal
              </th>
              <th className="pb-3 text-right text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item, idx) => (
              <tr key={idx} className="align-top">
                <td className="py-4 pr-4">
                  <div className="font-medium tracking-tight">
                    {item.address || "Listing"}
                    {item.unit ? `, Apt ${item.unit}` : ""}
                  </div>
                  <div className="mt-1.5 space-y-0.5 text-[12px] text-muted-foreground">
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
                <td className="py-4 pr-4 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(item.subtotal ?? 0, 2)}
                </td>
                <td className="py-4 text-right font-medium tabular-nums">
                  {formatCurrency(item.total ?? 0, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end border-t pt-8">
        <dl className="w-full max-w-xs space-y-2.5 text-[13px]">
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
          <div className="flex items-center justify-between border-t pt-3 text-[15px] font-semibold tracking-tight">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {formatCurrency(invoice.total ?? 0, 2)}
            </dd>
          </div>
        </dl>
      </div>

      {invoice.notes ? (
        <div className="mt-8 border-t pt-8">
          <SectionLabel>Notes</SectionLabel>
          <p className="mt-2 whitespace-pre-wrap text-[13px] text-muted-foreground">
            {invoice.notes}
          </p>
        </div>
      ) : null}

      <div className="mt-10 flex items-center justify-between border-t pt-6 text-[11px] text-muted-foreground">
        <span>Thank you for your business.</span>
        <span className="font-mono tabular-nums">{invoice.number}</span>
      </div>
    </article>
  );
}
