import { useState } from "react";
import { ArrowLeft, Check, Download, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { clientLabel, monthName } from "@/lib/invoice";
import type { Client, Invoice } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";
import { InvoiceDocument } from "@/components/invoices/invoice-document";

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
  const paid = invoice.status === "paid";
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Dynamic import so @react-pdf/renderer (~1.5MB) only lands
      // in the network cache the first time a user downloads an
      // invoice, not on every page load.
      const { downloadInvoicePdf } = await import(
        "@/components/invoices/invoice-pdf"
      );
      await downloadInvoicePdf(invoice, client);
    } catch (err) {
      toast.error("Couldn't build the PDF", {
        description:
          err instanceof Error ? err.message : "Try printing to PDF instead.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <header className="app-header flex flex-col justify-center gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8 print:hidden">
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
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {invoice.number}
            </h1>
            <div className="truncate text-xs text-muted-foreground">
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
            <Check className="mr-1.5 h-4 w-4" aria-hidden />
            {paid ? "Mark as unpaid" : "Mark as paid"}
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            {downloading ? "Building PDF…" : "Download PDF"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
            Delete
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-muted/30 p-6 print:bg-transparent print:p-0">
        <InvoiceDocument invoice={invoice} client={client} />
      </div>
    </div>
  );
}
