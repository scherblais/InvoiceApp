import { useRef } from "react";
import { Download, LogOut, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    realtors,
    config,
    saveInvoices,
    saveDrafts,
    saveClients,
    saveCalEvents,
    saveRealtors,
    saveConfig,
  } = useData();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      data: { invoices, drafts, clients, calEvents, realtors, config },
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
    if (
      !window.confirm(
        "Importing will overwrite your current data. Make sure you have a backup. Continue?"
      )
    ) {
      e.target.value = "";
      return;
    }
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
        if (Array.isArray(data.clients)) saveClients(data.clients);
        if (Array.isArray(data.calEvents)) saveCalEvents(data.calEvents);
        if (Array.isArray(data.realtors)) saveRealtors(data.realtors);
        if (data.config && typeof data.config === "object")
          saveConfig(data.config);
        toast.success("Backup restored");
      } catch (err) {
        toast.error("Import failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleSignOut = async () => {
    await logout();
    navigate("/login");
  };

  const totalRecords =
    invoices.length +
    drafts.length +
    clients.length +
    calEvents.length +
    realtors.length;

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
            <dt className="text-xs text-muted-foreground">Realtors</dt>
            <dd className="tabular-nums">{realtors.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Total records</dt>
            <dd className="tabular-nums font-semibold">{totalRecords}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
