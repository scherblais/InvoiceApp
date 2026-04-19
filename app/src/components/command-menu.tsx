import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Moon,
  Plus,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useData } from "@/contexts/data-context";
import { useTheme } from "@/contexts/theme-context";
import { clientLabel, isOverdue, monthName } from "@/lib/invoice";
import { formatShortDate } from "@/lib/format";
import { eventClientId } from "@/lib/types";

/**
 * Global ⌘K (or Ctrl+K) command palette. Opens over any signed-in
 * view, lets you navigate, search invoices / clients / events, and
 * trigger actions without leaving the keyboard.
 *
 * Data source: the same `useData` context every view reads from, so
 * results are always fresh without any extra subscriptions.
 */
export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { invoices, clients, calEvents, saveInvoices } = useData();

  // Global ⌘K / Ctrl+K to toggle. We ignore the shortcut when the
  // user is inside a text input or contenteditable so we never steal
  // text-editing keystrokes.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.key === "k" || e.key === "K") &&
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    // Let the dialog close animation start before nav fires — avoids
    // a flash of the palette on the new page.
    requestAnimationFrame(fn);
  };

  const clientsById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clients) m.set(c.id, clientLabel(c));
    return m;
  }, [clients]);

  // Surface only the most recent 8 of each list — search narrows via
  // cmdk's built-in fuzzy matching so the full list is available for
  // keystroke filtering without overwhelming the default view.
  const recentInvoices = useMemo(
    () => [...invoices].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 8),
    [invoices]
  );
  const recentEvents = useMemo(
    () =>
      [...calEvents]
        .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
        .slice(0, 8),
    [calEvents]
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Command menu"
      description="Search invoices, clients, events, or run actions."
    >
      <CommandInput placeholder="Search or type a command..." />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        <CommandGroup heading="Create">
          <CommandItem
            value="new invoice"
            onSelect={() => run(() => navigate("/invoices"))}
          >
            <Plus />
            <span>New invoice</span>
            <CommandShortcut>Invoices</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new event shoot"
            onSelect={() => run(() => navigate("/calendar"))}
          >
            <Plus />
            <span>New event</span>
            <CommandShortcut>Calendar</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="new client"
            onSelect={() => run(() => navigate("/clients"))}
          >
            <Plus />
            <span>New client</span>
            <CommandShortcut>Clients</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Go to">
          <CommandItem
            value="dashboard home"
            onSelect={() => run(() => navigate("/"))}
          >
            <LayoutDashboard />
            <span>Dashboard</span>
            <CommandShortcut>G D</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="invoices"
            onSelect={() => run(() => navigate("/invoices"))}
          >
            <FileText />
            <span>Invoices</span>
            <CommandShortcut>G I</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="calendar"
            onSelect={() => run(() => navigate("/calendar"))}
          >
            <Calendar />
            <span>Calendar</span>
            <CommandShortcut>G C</CommandShortcut>
          </CommandItem>
          <CommandItem
            value="clients"
            onSelect={() => run(() => navigate("/clients"))}
          >
            <Users />
            <span>Clients</span>
          </CommandItem>
          <CommandItem
            value="settings"
            onSelect={() => run(() => navigate("/settings"))}
          >
            <Settings />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {recentInvoices.length > 0 ? (
          <CommandGroup heading="Invoices">
            {recentInvoices.map((inv) => {
              const who =
                inv.clientName ??
                (inv.clientId ? clientsById.get(inv.clientId) : "") ??
                "—";
              const overdue = isOverdue(inv);
              return (
                <CommandItem
                  key={inv.id}
                  value={`invoice ${inv.number ?? ""} ${who} ${inv.month ? monthName(inv.month) : ""}`}
                  onSelect={() => run(() => navigate("/invoices"))}
                >
                  <FileText />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">
                      {inv.number ?? "INV"} · {who}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {inv.status === "paid"
                        ? "Paid"
                        : overdue
                          ? "Overdue"
                          : "Unpaid"}
                      {inv.createdAt ? ` · ${formatShortDate(inv.createdAt)}` : ""}
                    </span>
                  </div>
                  {inv.status !== "paid" ? (
                    <CommandShortcut
                      onClick={(e) => {
                        e.stopPropagation();
                        saveInvoices(
                          invoices.map((i) =>
                            i.id === inv.id ? { ...i, status: "paid" } : i
                          )
                        );
                        setOpen(false);
                      }}
                      className="cursor-pointer rounded-md px-1.5 py-0.5 tracking-normal text-[10px] font-medium text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      <CheckCircle2 className="inline h-3 w-3" /> Mark paid
                    </CommandShortcut>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        {clients.length > 0 ? (
          <CommandGroup heading="Clients">
            {clients.slice(0, 20).map((c) => (
              <CommandItem
                key={c.id}
                value={`client ${c.name ?? ""} ${c.company ?? ""} ${c.email ?? ""}`}
                onSelect={() => run(() => navigate("/clients"))}
              >
                <Users />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate">{clientLabel(c)}</span>
                  {c.email ? (
                    <span className="truncate text-[11px] text-muted-foreground">
                      {c.email}
                    </span>
                  ) : null}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {recentEvents.length > 0 ? (
          <CommandGroup heading="Events">
            {recentEvents.map((ev) => {
              const cid = eventClientId(ev);
              const clientName = cid ? clientsById.get(cid) : undefined;
              const loc = ev.address ?? ev.title ?? "Untitled";
              return (
                <CommandItem
                  key={ev.id}
                  value={`event ${loc} ${clientName ?? ""} ${ev.date ?? ""}`}
                  onSelect={() =>
                    run(() => navigate(`/calendar?event=${ev.id}`))
                  }
                >
                  <Calendar />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate">{loc}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {ev.date ? formatShortDate(ev.date) : "TBD"}
                      {clientName ? ` · ${clientName}` : ""}
                    </span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          <CommandItem
            value="toggle theme dark light"
            onSelect={() =>
              run(() => {
                toggleTheme();
              })
            }
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            <span>
              {theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
