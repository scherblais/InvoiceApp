import { useMemo, useState } from "react";
import { Mail, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Client } from "@/lib/types";
import { clientInitials } from "@/lib/invoice";

interface ClientsTabProps {
  clients: Client[];
  onSave: (next: Client[]) => void;
}

interface DialogState {
  open: boolean;
  initial: Client | null;
}

function ClientFormDialog({
  state,
  onOpenChange,
  onSave,
  onDelete,
}: {
  state: DialogState;
  onOpenChange: (open: boolean) => void;
  onSave: (c: Client) => void;
  onDelete?: (id: string) => void;
}) {
  const [name, setName] = useState(state.initial?.name ?? "");
  const [company, setCompany] = useState(state.initial?.company ?? "");
  const [email, setEmail] = useState(state.initial?.email ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    if (!name.trim() && !company.trim()) {
      setError("Enter a name or company");
      return;
    }
    const client: Client = {
      id: state.initial?.id ?? `c_${Date.now()}`,
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
    };
    onSave(client);
    onOpenChange(false);
  };

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {state.initial ? "Edit client" : "New client"}
          </DialogTitle>
          <DialogDescription>
            Use company for agencies/brokerages, or name for individuals.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-name">Name</Label>
            <Input
              id="ct-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-company">Company</Label>
            <Input
              id="ct-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Press Realty"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-email">Email</Label>
            <Input
              id="ct-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <div>
            {state.initial && onDelete ? (
              <Button
                variant="ghost"
                onClick={() => {
                  if (!state.initial) return;
                  if (
                    window.confirm(
                      `Delete ${
                        state.initial.company || state.initial.name || "this client"
                      }? Existing invoices are kept.`
                    )
                  ) {
                    onDelete(state.initial.id);
                    onOpenChange(false);
                  }
                }}
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
              {state.initial ? "Save changes" : "Add client"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ClientsTab({ clients, onSave }: ClientsTabProps) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState>({
    open: false,
    initial: null,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...clients].sort((a, b) =>
      (a.company || a.name || "").localeCompare(b.company || b.name || "")
    );
    if (!q) return sorted;
    return sorted.filter((c) =>
      [c.name, c.company, c.email]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [clients, query]);

  const handleSave = (next: Client) => {
    const idx = clients.findIndex((c) => c.id === next.id);
    if (idx >= 0) {
      onSave(clients.map((c) => (c.id === next.id ? next : c)));
    } else {
      onSave([...clients, next]);
    }
  };

  const handleDelete = (id: string) => {
    onSave(clients.filter((c) => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            className="pl-8"
          />
        </div>
        <Button
          size="sm"
          onClick={() => setDialog({ open: true, initial: null })}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New client
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {query ? "No clients match your search." : "No clients yet."}
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <ul className="divide-y">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setDialog({ open: true, initial: c })}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {clientInitials(c)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">
                      {c.company || c.name || "Unnamed"}
                    </div>
                    {c.company && c.name ? (
                      <div className="truncate text-xs text-muted-foreground">
                        {c.name}
                      </div>
                    ) : null}
                  </div>
                  {c.email ? (
                    <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{c.email}</span>
                    </div>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dialog.open ? (
        <ClientFormDialog
          key={dialog.initial?.id ?? "new"}
          state={dialog}
          onOpenChange={(open) =>
            setDialog(open ? dialog : { open: false, initial: null })
          }
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}
