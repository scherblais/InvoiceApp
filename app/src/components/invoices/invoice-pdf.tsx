import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { formatCurrency, formatLongDate } from "@/lib/format";
import { clientLabel, monthName } from "@/lib/invoice";
import type { Client, Invoice } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";

// Register Inter via the same CDN the Google fonts repo serves so
// we don't ship the font file. react-pdf fetches it once and caches
// per page generation.
Font.register({
  family: "Inter",
  fonts: [
    { src: "https://rsms.me/inter/font-files/Inter-Regular.woff", fontWeight: 400 },
    { src: "https://rsms.me/inter/font-files/Inter-Medium.woff", fontWeight: 500 },
    { src: "https://rsms.me/inter/font-files/Inter-SemiBold.woff", fontWeight: 600 },
    { src: "https://rsms.me/inter/font-files/Inter-Bold.woff", fontWeight: 700 },
  ],
});

// hyphen in -Mono variant causes issues; use system monospace for
// the invoice number which just needs tabular glyphs.

const palette = {
  ink: "#0a0a0a",
  dim: "#6b7280",
  faint: "#9ca3af",
  hair: "#e5e7eb",
  surface: "#f8f8f8",
  accent: "#0a0a0a",
};

const styles = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: palette.ink,
    padding: 48,
    lineHeight: 1.45,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: palette.hair,
    paddingBottom: 24,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandTile: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: palette.ink,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    textAlign: "center",
    paddingTop: 7,
  },
  brandText: {
    fontSize: 12,
    fontWeight: 600,
  },
  brandSub: {
    fontSize: 9,
    color: palette.dim,
    marginTop: 1,
  },

  invoiceBlock: {
    alignItems: "flex-end",
  },
  invoiceLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: palette.dim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  invoiceNumber: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  invoiceMeta: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 6,
    color: palette.dim,
    fontSize: 9,
  },
  pill: {
    borderWidth: 1,
    borderColor: palette.hair,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 8,
    fontWeight: 500,
    color: palette.ink,
  },

  billRow: {
    flexDirection: "row",
    gap: 32,
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: palette.hair,
  },
  billCol: { flex: 1 },
  billLabel: {
    fontSize: 8,
    fontWeight: 600,
    color: palette.dim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  billValue: {
    fontSize: 11,
    fontWeight: 500,
    marginTop: 6,
    letterSpacing: -0.2,
  },
  billSub: {
    fontSize: 9,
    color: palette.dim,
    marginTop: 2,
  },

  itemsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.hair,
    paddingVertical: 10,
    marginTop: 24,
  },
  itemsHeaderCell: {
    fontSize: 8,
    fontWeight: 600,
    color: palette.dim,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  colListing: { flex: 1, paddingRight: 12 },
  colAmount: { width: 80, textAlign: "right" },

  itemRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.hair,
    paddingVertical: 14,
    alignItems: "flex-start",
  },
  itemTitle: {
    fontSize: 10.5,
    fontWeight: 500,
    letterSpacing: -0.2,
  },
  itemDetail: {
    fontSize: 9,
    color: palette.dim,
    marginTop: 3,
  },
  itemAmount: {
    fontSize: 10,
    fontVariant: ["tabular-nums"],
  },
  itemAmountTotal: {
    fontSize: 10,
    fontWeight: 500,
    fontVariant: ["tabular-nums"],
  },

  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  totalsBlock: {
    width: 260,
    borderTopWidth: 1,
    borderTopColor: palette.hair,
    paddingTop: 16,
  },
  totalsLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    fontSize: 10,
    color: palette.dim,
  },
  totalsLineFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: palette.hair,
    fontSize: 12,
    fontWeight: 600,
    color: palette.ink,
    letterSpacing: -0.2,
  },
  totalsLabel: {
    flex: 1,
  },
  totalsValue: {
    fontVariant: ["tabular-nums"],
  },

  notesBlock: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: palette.hair,
  },
  notesText: {
    marginTop: 6,
    fontSize: 10,
    color: palette.dim,
    lineHeight: 1.55,
  },

  footer: {
    position: "absolute",
    bottom: 36,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: palette.hair,
    paddingTop: 12,
    fontSize: 8,
    color: palette.faint,
  },
});

function statusLabel(inv: Invoice, isOverdue: boolean): string {
  if (inv.status === "paid") return "Paid";
  if (isOverdue) return "Overdue";
  return "Unpaid";
}

function isOverdue(inv: Invoice): boolean {
  if (inv.status === "paid") return false;
  if (!inv.createdAt) return false;
  const days = (Date.now() - inv.createdAt) / (1000 * 60 * 60 * 24);
  return days > 30;
}

interface InvoiceDocProps {
  invoice: Invoice & { items?: InvoiceItem[]; notes?: string };
  client?: Client | null;
}

/** React-PDF document mirroring the on-screen InvoiceDocument as
 *  closely as the PDF primitive set allows. Kept deliberately
 *  monochrome — the goal is a document that prints clean on any
 *  printer / renders crisp in any viewer. */
function InvoiceDoc({ invoice, client }: InvoiceDocProps) {
  const items: InvoiceItem[] = invoice.items ?? [];
  const overdue = isOverdue(invoice);

  return (
    <Document
      title={`${invoice.number ?? "Invoice"} · Lumeria Media`}
      author="Lumeria Media"
    >
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <Text style={styles.brandTile}>L</Text>
            <View>
              <Text style={styles.brandText}>Lumeria Media</Text>
              <Text style={styles.brandSub}>Real estate photography</Text>
            </View>
          </View>
          <View style={styles.invoiceBlock}>
            <Text style={styles.invoiceLabel}>Invoice</Text>
            <Text style={styles.invoiceNumber}>{invoice.number ?? "—"}</Text>
            <View style={styles.invoiceMeta}>
              <Text style={styles.pill}>{statusLabel(invoice, overdue)}</Text>
              <Text>
                {invoice.createdAt
                  ? formatLongDate(new Date(invoice.createdAt))
                  : formatLongDate()}
              </Text>
            </View>
          </View>
        </View>

        {/* Bill to */}
        <View style={styles.billRow}>
          <View style={styles.billCol}>
            <Text style={styles.billLabel}>Billed to</Text>
            <Text style={styles.billValue}>
              {invoice.clientName ?? clientLabel(client)}
            </Text>
            {client?.email ? (
              <Text style={styles.billSub}>{client.email}</Text>
            ) : null}
            {client?.phone ? (
              <Text style={styles.billSub}>{client.phone}</Text>
            ) : null}
          </View>
          <View style={[styles.billCol, { alignItems: "flex-end" }]}>
            <Text style={styles.billLabel}>Billing period</Text>
            <Text style={styles.billValue}>
              {invoice.month ? monthName(invoice.month) : "—"}
            </Text>
          </View>
        </View>

        {/* Line items */}
        <View style={styles.itemsHeader}>
          <Text style={[styles.itemsHeaderCell, styles.colListing]}>
            Listing
          </Text>
          <Text style={[styles.itemsHeaderCell, styles.colAmount]}>
            Subtotal
          </Text>
          <Text style={[styles.itemsHeaderCell, styles.colAmount]}>Total</Text>
        </View>

        {items.map((item, idx) => {
          const details: string[] = [];
          if (item.pkg?.name) {
            details.push(
              `${item.pkg.name}${
                item.pkgAmount ? ` · ${formatCurrency(item.pkgAmount, 2)}` : ""
              }`
            );
          }
          if (item.extrasQty) {
            details.push(
              `${item.extrasQty} × ${item.pkg?.extraLabel ?? "extra"}${
                item.extrasAmount
                  ? ` · ${formatCurrency(item.extrasAmount, 2)}`
                  : ""
              }`
            );
          }
          for (const a of item.addons ?? []) {
            const count = a.count && a.count > 1 ? ` × ${a.count}` : "";
            const price = a.totalPrice
              ? ` · ${formatCurrency(a.totalPrice, 2)}`
              : "";
            details.push(`${a.name}${count}${price}`);
          }
          if (item.travel?.fee) {
            details.push(
              `Travel (${item.travel.distance.toFixed(1)} km) · ${formatCurrency(item.travel.fee, 2)}`
            );
          }
          return (
            <View key={idx} style={styles.itemRow} wrap={false}>
              <View style={styles.colListing}>
                <Text style={styles.itemTitle}>
                  {item.address || "Listing"}
                  {item.unit ? `, Apt ${item.unit}` : ""}
                </Text>
                {details.map((d, i) => (
                  <Text key={i} style={styles.itemDetail}>
                    {d}
                  </Text>
                ))}
              </View>
              <Text style={[styles.itemAmount, styles.colAmount]}>
                {formatCurrency(item.subtotal ?? 0, 2)}
              </Text>
              <Text style={[styles.itemAmountTotal, styles.colAmount]}>
                {formatCurrency(item.total ?? 0, 2)}
              </Text>
            </View>
          );
        })}

        {/* Totals */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsBlock}>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(
                  invoice.subtotal ??
                    items.reduce((s, i) => s + (i.subtotal ?? 0), 0),
                  2
                )}
              </Text>
            </View>
            {invoice.discount && invoice.discount > 0 ? (
              <View style={styles.totalsLine}>
                <Text style={styles.totalsLabel}>
                  Discount
                  {invoice.discountInfo
                    ? ` (${invoice.discountInfo.value}${invoice.discountInfo.type})`
                    : ""}
                </Text>
                <Text style={styles.totalsValue}>
                  -{formatCurrency(invoice.discount, 2)}
                </Text>
              </View>
            ) : null}
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>GST (5%)</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(invoice.totalGst ?? 0, 2)}
              </Text>
            </View>
            <View style={styles.totalsLine}>
              <Text style={styles.totalsLabel}>QST (9.975%)</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(invoice.totalQst ?? 0, 2)}
              </Text>
            </View>
            <View style={styles.totalsLineFinal}>
              <Text style={styles.totalsLabel}>Total</Text>
              <Text style={styles.totalsValue}>
                {formatCurrency(invoice.total ?? 0, 2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes ? (
          <View style={styles.notesBlock} wrap={false}>
            <Text style={styles.billLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Thank you for your business.</Text>
          <Text>{invoice.number ?? ""}</Text>
        </View>
      </Page>
    </Document>
  );
}

/**
 * Render and download a proper PDF for the given invoice. Runs
 * entirely client-side; no Cloud Function dependency. Resolves when
 * the download dialog / save has been triggered.
 */
export async function downloadInvoicePdf(
  invoice: Invoice & { items?: InvoiceItem[]; notes?: string },
  client?: Client | null
): Promise<void> {
  const blob = await pdf(<InvoiceDoc invoice={invoice} client={client} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${invoice.number ?? "invoice"}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
