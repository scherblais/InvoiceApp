import { useRef, useState } from "react";
import { Copy, Download, ExternalLink, LogOut, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { useData } from "@/contexts/data-context";
import { useNavigate } from "react-router-dom";

export function AccountTab() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    invoices,
    drafts,
    clients,
    calEvents,
    config,
    saveInvoices,
    saveDrafts,
    saveClients,
    saveCalEvents,
    saveConfig,
  } = useData();
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 2,
      data: { invoices, drafts, clients, calEvents, config },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumeria-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Stash the file and show the confirm dialog. The actual parse happens in
    // `runImport` once the user approves.
    setPendingFile(file);
    if (fileInput.current) fileInput.current.value = "";
  };

  const runImport = () => {
    const file = pendingFile;
    setPendingFile(null);
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const data = parsed?.data ?? parsed;
        if (!data || typeof data !== "object") {
          throw new Error("Invalid backup file");
        }
        if (Array.isArray(data.invoices)) saveInvoices(data.invoices);
        if (Array.isArray(data.drafts)) saveDrafts(data.drafts);
        // Merge legacy `realtors` list (from pre-unification backups) into the
        // clients list on import so older exports keep working.
        const importedClients = Array.isArray(data.clients) ? data.clients : [];
        const legacyRealtors = Array.isArray(data.realtors) ? data.realtors : [];
        if (importedClients.length || legacyRealtors.length) {
          const byId = new Map();
          for (const c of importedClients) if (c?.id) byId.set(c.id, c);
          for (const r of legacyRealtors) if (r?.id && !byId.has(r.id)) byId.set(r.id, r);
          saveClients(Array.from(byId.values()));
        }
        if (Array.isArray(data.calEvents)) saveCalEvents(data.calEvents);
        if (data.config && typeof data.config === "object")
          saveConfig(data.config);
        toast.success("Backup restored");
      } catch (err) {
        toast.error("Import failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const totalRecords =
    invoices.length + drafts.length + clients.length + calEvents.length;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Account</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {user?.email ?? "—"}
          </span>
        </p>
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </section>

      {/* Booking link — public form that lands in the To Schedule
          panel. Shareable via any channel: email signature, Instagram
          bio, LinkedIn, QR code on a business card. */}
      {user ? (
        <section className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold">Booking link</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Send this URL to anyone who wants to request a shoot.
            Submissions land in your dashboard's To Schedule panel.
          </p>
          <BookingLinkRow uid={user.uid} />
        </section>
      ) : null}

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Backup &amp; restore</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Export a JSON snapshot of all your data, or restore from a previous
          export.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" />
            Export backup
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInput.current?.click()}
          >
            <Upload className="mr-1.5 h-4 w-4" />
            Import backup
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Storage</h3>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">Invoices</dt>
            <dd className="tabular-nums">{invoices.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Drafts</dt>
            <dd className="tabular-nums">{drafts.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Clients</dt>
            <dd className="tabular-nums">{clients.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Calendar events</dt>
            <dd className="tabular-nums">{calEvents.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total records</dt>
            <dd className="tabular-nums font-semibold">{totalRecords}</dd>
          </div>
        </dl>
      </section>

      <ConfirmDialog
        open={pendingFile !== null}
        onOpenChange={(open) => {
          if (!open) setPendingFile(null);
        }}
        title="Restore from this backup?"
        description="Importing will overwrite all of your current data. Make sure you already have a backup you can come back to."
        confirmLabel="Restore backup"
        destructive
        onConfirm={runImport}
      />
    </div>
  );
}

function BookingLinkRow({ uid }: { uid: string }) {
  const url = `${window.location.origin}/book?to=${uid}`;
  return (
    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
      <Input readOnly value={url} className="font-mono text-xs" />
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              toast.success("Booking link copied");
            } catch {
              toast.error("Couldn't copy");
            }
          }}
        >
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copy
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Preview
          </a>
        </Button>
      </div>
    </div>
  );
}
