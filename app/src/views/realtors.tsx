import { useMemo, useState } from "react";
import { Mail, Phone, Plus, Search, Users } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { RealtorDialog } from "@/components/realtors/realtor-dialog";
import type { Realtor } from "@/lib/types";

function realtorInitials(r: Realtor): string {
  const source = r.name || r.company || "";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RealtorsView() {
  const { realtors, saveRealtors, calEvents } = useData();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<
    | { open: false }
    | { open: true; initial: Realtor | null }
  >({ open: false });

  const eventCountByRealtor = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of calEvents) {
      if (!ev.realtorId) continue;
      map.set(ev.realtorId, (map.get(ev.realtorId) ?? 0) + 1);
    }
    return map;
  }, [calEvents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = realtors.filter((r): r is Realtor => !!r && !!r.id);
    const sorted = [...list].sort((a, b) =>
      (a.name || a.company || "").localeCompare(b.name || b.company || "")
    );
    if (!q) return sorted;
    return sorted.filter((r) =>
      [r.name, r.company, r.email, r.phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [realtors, query]);

  const handleSave = (next: Realtor) => {
    const idx = realtors.findIndex((r) => r.id === next.id);
    if (idx >= 0) {
      saveRealtors(realtors.map((r) => (r.id === next.id ? next : r)));
    } else {
      saveRealtors([...realtors, next]);
    }
  };

  const handleDelete = (id: string) => {
    saveRealtors(realtors.filter((r) => r.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Realtors</h1>
          <p className="text-xs text-muted-foreground">
            {realtors.length} {realtors.length === 1 ? "realtor" : "realtors"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search realtors"
              className="pl-8"
            />
          </div>
          <Button
            size="sm"
            onClick={() => setDialog({ open: true, initial: null })}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New realtor
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-5xl">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-16 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {query ? "No realtors match your search" : "No realtors yet"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {query
                    ? "Try a different name, company, or email."
                    : "Add realtors to attach them to calendar events."}
                </p>
              </div>
              {!query ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDialog({ open: true, initial: null })}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add your first realtor
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((r) => {
                const count = eventCountByRealtor.get(r.id) ?? 0;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDialog({ open: true, initial: r })}
                    className="group flex flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-foreground/20 hover:bg-accent/50"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-muted text-xs font-semibold">
                          {realtorInitials(r)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {r.name || "Unnamed"}
                        </div>
                        {r.company ? (
                          <div className="truncate text-xs text-muted-foreground">
                            {r.company}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {r.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.email}</span>
                        </div>
                      ) : null}
                      {r.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.phone}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between border-t pt-2 text-[11px] text-muted-foreground">
                      <span>
                        {count} {count === 1 ? "event" : "events"}
                      </span>
                      <span className="opacity-0 transition-opacity group-hover:opacity-100">
                        Edit →
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RealtorDialog
        open={dialog.open}
        onOpenChange={(open) =>
          setDialog(open ? { open: true, initial: null } : { open: false })
        }
        initial={dialog.open ? dialog.initial : null}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
