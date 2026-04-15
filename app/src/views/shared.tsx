import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, List, Loader2, Moon, Sun } from "lucide-react";
import { ref, onValue, off, db } from "@/lib/firebase";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { COLOR_DOT, type EventColor } from "@/lib/calendar";
import type { SharedData, SharedEvent } from "@/lib/shared";

const SHARED_COLS: { id: string; label: string; dot: string }[] = [
  { id: "received", label: "Received", dot: COLOR_DOT.rose },
  { id: "pending", label: "Pending", dot: COLOR_DOT.pink },
  { id: "scheduled", label: "Scheduled", dot: COLOR_DOT.blue },
  { id: "shooting", label: "Shooting", dot: COLOR_DOT.amber },
  { id: "editing", label: "Editing", dot: COLOR_DOT.purple },
  { id: "delivered", label: "Delivered", dot: COLOR_DOT.green },
];

function formatSharedTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${hr12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatSharedDateLong(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  const long = d.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  if (iso === todayISO) return `Today · ${long}`;
  if (iso === tomorrowISO) return `Tomorrow · ${long}`;
  return long;
}

function formatSharedDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

type ViewMode = "board" | "list";

interface CountMap {
  upcoming: number;
  inProgress: number;
  delivered: number;
}

function computeCounts(events: SharedEvent[]): CountMap {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    const s = ev.status || "scheduled";
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return {
    upcoming:
      (counts.received ?? 0) + (counts.pending ?? 0) + (counts.scheduled ?? 0),
    inProgress: (counts.shooting ?? 0) + (counts.editing ?? 0),
    delivered: counts.delivered ?? 0,
  };
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
        <Calendar className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function SharedBoard({ events }: { events: SharedEvent[] }) {
  const byStatus = useMemo(() => {
    const map = new Map<string, SharedEvent[]>();
    for (const col of SHARED_COLS) map.set(col.id, []);
    for (const ev of events) {
      const s = ev.status || "scheduled";
      (map.get(s) ?? map.get("scheduled"))?.push(ev);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.date || "").localeCompare(b.date || "") ||
          (a.start || "").localeCompare(b.start || "")
      );
    }
    return map;
  }, [events]);

  const visibleCols = SHARED_COLS.filter(
    (c) => (byStatus.get(c.id)?.length ?? 0) > 0
  );

  if (!visibleCols.length) {
    return (
      <Empty
        title="No appointments yet"
        sub="Your photographer will share upcoming shoots here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {visibleCols.map((col) => {
        const list = byStatus.get(col.id) ?? [];
        return (
          <div key={col.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
            <div className="flex items-center gap-2 px-1 text-sm font-semibold">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: col.dot }}
              />
              <span>{col.label}</span>
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {list.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {list.map((ev, i) => {
                const loc = ev.unit ? `${ev.address}, ${ev.unit}` : ev.address ?? ev.title ?? "";
                const timeStr = ev.start ? formatSharedTime(ev.start) : "";
                return (
                  <div
                    key={`${ev.date}-${ev.start}-${i}`}
                    className="rounded-md border bg-background/50 p-3"
                  >
                    <div className="text-sm font-medium">{loc}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatSharedDate(ev.date)}
                        {timeStr ? ` · ${timeStr}` : ""}
                      </span>
                    </div>
                    {ev.notes ? (
                      <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                        {ev.notes}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SharedList({ events }: { events: SharedEvent[] }) {
  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) =>
          (a.date || "").localeCompare(b.date || "") ||
          (a.start || "").localeCompare(b.start || "")
      ),
    [events]
  );

  const byDate = useMemo(() => {
    const map = new Map<string, SharedEvent[]>();
    for (const ev of sorted) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [sorted]);

  const dates = Array.from(byDate.keys()).sort();
  if (!dates.length) {
    return (
      <Empty
        title="No appointments yet"
        sub="Your photographer will share upcoming shoots here."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {dates.map((date) => {
        const evs = byDate.get(date) ?? [];
        return (
          <section key={date} className="flex flex-col gap-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {formatSharedDateLong(date)}
            </div>
            <div className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
              {evs.map((ev, i) => {
                const loc = ev.unit ? `${ev.address}, ${ev.unit}` : ev.address ?? ev.title ?? "";
                const timeStr = ev.start ? formatSharedTime(ev.start) : "—";
                const col =
                  SHARED_COLS.find((c) => c.id === (ev.status || "scheduled")) ??
                  SHARED_COLS[2];
                return (
                  <div
                    key={`${ev.date}-${ev.start}-${i}`}
                    className="flex items-start gap-4 p-4"
                  >
                    <div className="min-w-16 shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                      {timeStr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{loc}</div>
                      {ev.notes ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {ev.notes}
                        </div>
                      ) : null}
                      <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] text-muted-foreground">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: col.dot }}
                        />
                        <span>{col.label}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function SharedView() {
  const [params] = useSearchParams();
  const token = params.get("share");
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<ViewMode>(() =>
    (localStorage.getItem("shared_view_mode") as ViewMode) || "board"
  );
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!token) {
      setError("Missing share token");
      setLoading(false);
      return;
    }
    const r = ref(db, `shared/${token}`);
    const listener = onValue(
      r,
      (snap) => {
        const val = snap.val() as SharedData | null;
        setData(val);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Failed to load");
        setLoading(false);
      }
    );
    return () => off(r, "value", listener);
  }, [token]);

  const handleSetMode = (m: ViewMode) => {
    setMode(m);
    localStorage.setItem("shared_view_mode", m);
  };

  const events = useMemo(() => {
    const raw = data?.events ?? [];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw) as SharedEvent[];
  }, [data]);

  const counts = useMemo(() => computeCounts(events), [events]);

  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = data?.realtorName || "";
  const company = data?.realtorCompany || "";

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 text-center">
        <p className="text-sm font-medium">Can't load this page</p>
        <p className="text-sm text-muted-foreground">
          {error ?? "This share link is missing or invalid."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <LumeriaLogo className="h-4 w-4 text-primary" />
            Lumeria Media
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="text-sm text-muted-foreground">{greet}</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {name || "Your Shoots"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {company
              ? `${company} · Live status from Lumeria Media`
              : "Live status from Lumeria Media"}
          </p>
        </div>

        {data && events.length > 0 ? (
          <>
            {/* Stats */}
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLOR_DOT.blue as EventColor }}
                />
                <div>
                  <div className="text-xl font-semibold tabular-nums">
                    {counts.upcoming}
                  </div>
                  <div className="text-xs text-muted-foreground">Upcoming</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLOR_DOT.amber as EventColor }}
                />
                <div>
                  <div className="text-xl font-semibold tabular-nums">
                    {counts.inProgress}
                  </div>
                  <div className="text-xs text-muted-foreground">In progress</div>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: COLOR_DOT.green as EventColor }}
                />
                <div>
                  <div className="text-xl font-semibold tabular-nums">
                    {counts.delivered}
                  </div>
                  <div className="text-xs text-muted-foreground">Delivered</div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-end gap-1">
              <Button
                variant={mode === "board" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSetMode("board")}
              >
                <Calendar className="mr-1.5 h-4 w-4" />
                Board
              </Button>
              <Button
                variant={mode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => handleSetMode("list")}
              >
                <List className="mr-1.5 h-4 w-4" />
                List
              </Button>
            </div>

            {mode === "board" ? (
              <SharedBoard events={events} />
            ) : (
              <SharedList events={events} />
            )}
          </>
        ) : (
          <Empty
            title="No appointments yet"
            sub="Your photographer will share upcoming shoots here."
          />
        )}
      </div>
    </div>
  );
}
