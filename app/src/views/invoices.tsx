import { useCallback, useState } from "react";
import { useData } from "@/contexts/data-context";
import { InvoiceList } from "@/components/invoices/invoice-list";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceEditor } from "@/components/invoices/invoice-editor";
import { NewClientDialog } from "@/components/invoices/new-client-dialog";
import type { Client, Draft, Invoice } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";

type Mode =
  | { kind: "list" }
  | { kind: "view"; invoiceId: string }
  | { kind: "edit-invoice"; invoiceId: string }
  | { kind: "edit-draft"; draftId: string | null };

export function InvoicesView() {
  const {
    invoices,
    drafts,
    clients,
    config,
    saveInvoices,
    saveDrafts,
    saveClients,
  } = useData();

  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [newClientOpen, setNewClientOpen] = useState(false);

  const goList = useCallback(() => setMode({ kind: "list" }), []);

  const handleSaveDraft = useCallback(
    (draft: Draft) => {
      const idx = drafts.findIndex((d) => d.id === draft.id);
      const next =
        idx >= 0
          ? drafts.map((d) => (d.id === draft.id ? draft : d))
          : [...drafts, draft];
      saveDrafts(next);
    },
    [drafts, saveDrafts]
  );

  const handleDeleteDraft = useCallback(
    (id: string) => {
      saveDrafts(drafts.filter((d) => d.id !== id));
      goList();
    },
    [drafts, saveDrafts, goList]
  );

  const handleSendInvoice = useCallback(
    (invoice: Invoice) => {
      const idx = invoices.findIndex((i) => i.id === invoice.id);
      const nextInvoices =
        idx >= 0
          ? invoices.map((i) => (i.id === invoice.id ? invoice : i))
          : [...invoices, invoice];
      saveInvoices(nextInvoices);
      // Drop any in-flight draft that shares the same clientId+month
      const nextDrafts = drafts.filter(
        (d) => !(d.clientId === invoice.clientId && d.month === invoice.month)
      );
      if (nextDrafts.length !== drafts.length) saveDrafts(nextDrafts);
      setMode({ kind: "view", invoiceId: invoice.id });
    },
    [invoices, drafts, saveInvoices, saveDrafts]
  );

  const handleToggleStatus = useCallback(
    (invoiceId: string) => {
      saveInvoices(
        invoices.map((i) =>
          i.id === invoiceId
            ? {
                ...i,
                status: i.status === "paid" ? "sent" : "paid",
                ...(i.status === "paid"
                  ? { paidAt: undefined }
                  : { paidAt: Date.now() }),
              } as Invoice
            : i
        )
      );
    },
    [invoices, saveInvoices]
  );

  const handleDeleteInvoice = useCallback(
    (invoiceId: string) => {
      if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
      saveInvoices(invoices.filter((i) => i.id !== invoiceId));
      goList();
    },
    [invoices, saveInvoices, goList]
  );

  const handleCreateClient = useCallback(
    (client: Client) => {
      saveClients([...clients, client]);
    },
    [clients, saveClients]
  );

  if (mode.kind === "list") {
    return (
      <InvoiceList
        invoices={invoices}
        drafts={drafts}
        clients={clients}
        onNew={() => setMode({ kind: "edit-draft", draftId: null })}
        onOpenInvoice={(id) => setMode({ kind: "view", invoiceId: id })}
        onOpenDraft={(id) => setMode({ kind: "edit-draft", draftId: id })}
      />
    );
  }

  if (mode.kind === "view") {
    const invoice = invoices.find((i) => i.id === mode.invoiceId) as
      | (Invoice & { items?: InvoiceItem[]; notes?: string })
      | undefined;
    if (!invoice) {
      return (
        <div className="flex h-full items-center justify-center p-8 text-sm text-muted-foreground">
          Invoice not found.
        </div>
      );
    }
    const client =
      (invoice.clientId && clients.find((c) => c.id === invoice.clientId)) ||
      null;
    return (
      <InvoicePreview
        invoice={invoice}
        client={client}
        onBack={goList}
        onEdit={() =>
          setMode({ kind: "edit-invoice", invoiceId: mode.invoiceId })
        }
        onDelete={() => handleDeleteInvoice(mode.invoiceId)}
        onToggleStatus={() => handleToggleStatus(mode.invoiceId)}
      />
    );
  }

  if (mode.kind === "edit-invoice") {
    const invoice = invoices.find((i) => i.id === mode.invoiceId);
    return (
      <>
        <InvoiceEditor
          source={invoice as Invoice & { items?: InvoiceItem[] } | null}
          isDraft={false}
          clients={clients}
          invoices={invoices}
          config={config}
          onBack={() => setMode({ kind: "view", invoiceId: mode.invoiceId })}
          onSaveDraft={handleSaveDraft}
          onSend={handleSendInvoice}
          onNewClient={() => setNewClientOpen(true)}
        />
        <NewClientDialog
          open={newClientOpen}
          onOpenChange={setNewClientOpen}
          onCreate={handleCreateClient}
        />
      </>
    );
  }

  // edit-draft
  const draft = mode.draftId
    ? (drafts.find((d) => d.id === mode.draftId) as
        | (Draft & { items?: InvoiceItem[]; notes?: string })
        | undefined)
    : null;
  return (
    <>
      <InvoiceEditor
        source={draft ?? null}
        isDraft={true}
        clients={clients}
        invoices={invoices}
        config={config}
        onBack={goList}
        onSaveDraft={handleSaveDraft}
        onDeleteDraft={handleDeleteDraft}
        onSend={handleSendInvoice}
        onNewClient={() => setNewClientOpen(true)}
      />
      <NewClientDialog
        open={newClientOpen}
        onOpenChange={setNewClientOpen}
        onCreate={handleCreateClient}
      />
    </>
  );
}
