import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar,
  DollarSign,
  Image as ImageIcon,
  Images,
  List,
  Loader2,
  Moon,
  Package as PackageIcon,
  Sun,
} from "lucide-react";
import { ref, onValue, off, db } from "@/lib/firebase";
import { useTheme } from "@/contexts/theme-context";
import { Button } from "@/components/ui/button";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { DeliveryGallery } from "@/components/shared/delivery-gallery";
import { COLOR_DOT, type EventColor } from "@/lib/calendar";
import type { SharedData, SharedEvent } from "@/lib/shared";
import { cn } from "@/lib/utils";

const SHARED_COLS: { id: string; label: string; dot: string }[] = [
  { id: "received", label: "Received", dot: COLOR_DOT.rose },
  { id: "pending", label: "Pending", dot: COLOR_DOT.pink },
  { id: "scheduled", label: "Scheduled", dot: COLOR_DOT.blue },
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

function formatDollar(value: number): string {
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

type ViewMode = "board" | "list";
type Tab = "appointments" | "pricing";

interface CountMap {
  upcoming: number;
  delivered: number;
  files: number;
}

function computeCounts(events: SharedEvent[]): CountMap {
  const counts: Record<string, number> = {};
  let files = 0;
  for (const ev of events) {
    const s = ev.status || "scheduled";
    // Legacy statuses collapse into the active bucket — the workflow
    // doesn't surface Shooting / Editing separately anymore.
    const bucket = s === "shooting" || s === "editing" ? "scheduled" : s;
    counts[bucket] = (counts[bucket] ?? 0) + 1;
    files += ev.files?.length ?? 0;
  }
  return {
    upcoming:
      (counts.received ?? 0) + (counts.pending ?? 0) + (counts.scheduled ?? 0),
    delivered: counts.delivered ?? 0,
    files,
  };
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-background p-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
        <Calendar className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

/**
 * Compact summary + "View & download" button shown inline on each
 * event card. The actual gallery opens in a full-screen modal so the
 * client can browse thumbnails, preview in a lightbox, and grab
 * everything as a zip.
 */
function FilesBadge({
  files,
  onOpen,
}: {
  files: SharedEvent["files"];
  onOpen: () => void;
}) {
  if (!files || !files.length) return null;
  const photos = files.filter((f) => f.kind === "photo").length;
  const videos = files.filter((f) => f.kind === "video").length;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} ${photos === 1 ? "photo" : "photos"}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? "video" : "videos"}`);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mt-3 flex w-full items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Images className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1">
        View &amp; download
        <span className="ml-1 font-normal text-muted-foreground">
          · {parts.join(" · ")}
        </span>
      </span>
      <span className="shrink-0 text-muted-foreground">→</span>
    </button>
  );
}

function SharedBoard({
  events,
  onOpenGallery,
}: {
  events: SharedEvent[];
  onOpenGallery: (ev: SharedEvent) => void;
}) {
  const byStatus = useMemo(() => {
    const map = new Map<string, SharedEvent[]>();
    for (const col of SHARED_COLS) map.set(col.id, []);
    for (const ev of events) {
      const s = ev.status || "scheduled";
      const bucket = s === "shooting" || s === "editing" ? "scheduled" : s;
      (map.get(bucket) ?? map.get("scheduled"))?.push(ev);
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

  // Every lane always renders so the board reads as a complete
  // pipeline even when some stages are empty — clients can see at a
  // glance where their shoots are in the workflow. The outer
  // "No appointments at all" empty state fires only when there's
  // zero activity period.
  if (events.length === 0) {
    return (
      <Empty
        title="No appointments yet"
        sub="Your photographer will share upcoming shoots here."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      {SHARED_COLS.map((col) => {
        const list = byStatus.get(col.id) ?? [];
        return (
          <div
            key={col.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3"
          >
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
            <div className="flex flex-1 flex-col gap-2">
              {list.length === 0 ? (
                <SharedEmptyColumn label={col.label} dot={col.dot} />
              ) : (
                list.map((ev, i) => {
                  const loc = ev.unit
                    ? `${ev.address}, ${ev.unit}`
                    : ev.address ?? ev.title ?? "";
                  const timeStr = ev.start ? formatSharedTime(ev.start) : "";
                  return (
                    <div
                      key={`${ev.date}-${ev.start}-${i}`}
                      className="rounded-md border bg-background/50 p-3"
                    >
                      <div className="text-sm font-medium">{loc}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" aria-hidden />
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
                      <FilesBadge
                        files={ev.files}
                        onOpen={() => onOpenGallery(ev)}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Per-lane empty state on the client-facing board. Read-only — no
 * "drag a card here" copy since clients can't edit. Just a quiet
 * acknowledgement that the stage is currently empty so the
 * pipeline still reads as four lanes instead of collapsing.
 */
function SharedEmptyColumn({
  label,
  dot,
}: {
  label: string;
  dot: string;
}) {
  const copy: Record<string, string> = {
    Received: "No new inquiries yet.",
    Pending: "Nothing pending.",
    Scheduled: "Nothing booked here.",
    Delivered: "No deliveries yet.",
  };
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/30 px-3 py-8 text-center">
      <span
        className="h-2 w-2 rounded-full opacity-60"
        style={{ background: dot }}
        aria-hidden
      />
      <p className="text-xs text-muted-foreground">
        {copy[label] ?? `No ${label.toLowerCase()} shoots.`}
      </p>
    </div>
  );
}

function SharedList({
  events,
  onOpenGallery,
}: {
  events: SharedEvent[];
  onOpenGallery: (ev: SharedEvent) => void;
}) {
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
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
                    className="flex flex-col gap-3 p-4 md:flex-row md:items-start"
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
                      <FilesBadge
                        files={ev.files}
                        onOpen={() => onOpenGallery(ev)}
                      />
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

function SharedPricingView({ data }: { data: SharedData }) {
  const pricing = data.pricing;
  if (!pricing) {
    return (
      <Empty
        title="No pricing shared yet"
        sub="Your photographer hasn't published pricing for you. It'll show up here automatically once they do."
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {pricing.discount ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <DollarSign className="h-4 w-4" aria-hidden />
          </div>
          <div>
            <div className="text-sm font-medium">{pricing.discount.label}</div>
            <div className="text-xs text-muted-foreground">
              Applied to every invoice pre-tax.
            </div>
          </div>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <PackageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          Packages
        </h2>
        <ul className="flex flex-col divide-y overflow-hidden rounded-lg border bg-card">
          {pricing.packages.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{p.name}</div>
                {p.extraLabel && p.extraPrice ? (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    + {formatDollar(p.extraPrice)} per extra{" "}
                    {p.extraLabel.toLowerCase().replace("extra ", "")}
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                {formatDollar(p.price)}
              </div>
            </li>
          ))}
          {pricing.packages.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted-foreground">
              No packages configured.
            </li>
          ) : null}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ImageIcon className="h-4 w-4 text-muted-foreground" aria-hidden />
          Add-ons
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {pricing.addons.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.name}</div>
                {a.qty ? (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    Per unit
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 text-sm font-semibold tabular-nums">
                {formatDollar(a.price)}
              </div>
            </li>
          ))}
          {pricing.addons.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted-foreground">
              No add-ons configured.
            </li>
          ) : null}
        </ul>
      </section>

      <p className="text-[11px] text-muted-foreground">
        Prices shown reflect your account. Taxes (GST 5% + QST 9.975%)
        are added on the invoice.
      </p>
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
  const [tab, setTab] = useState<Tab>("appointments");
  const [galleryEvent, setGalleryEvent] = useState<SharedEvent | null>(null);
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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <LumeriaLogo className="h-4 w-4 text-primary" aria-hidden />
            Lumeria Media
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" aria-hidden />
            ) : (
              <Moon className="h-4 w-4" aria-hidden />
            )}
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        {/* Hero */}
        <div className="mb-10">
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

        {/* Top-level tabs */}
        <div className="mb-8 flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setTab("appointments")}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              tab === "appointments"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Appointments
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 bg-primary transition-opacity",
                tab === "appointments" ? "opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => setTab("pricing")}
            className={cn(
              "relative px-3 py-2 text-sm font-medium transition-colors",
              tab === "pricing"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Pricing
            <span
              className={cn(
                "absolute inset-x-0 -bottom-px h-0.5 bg-primary transition-opacity",
                tab === "pricing" ? "opacity-100" : "opacity-0"
              )}
              aria-hidden
            />
          </button>
        </div>

        <div
          key={tab}
          className="animate-in fade-in-0 duration-150 ease-out motion-reduce:animate-none"
        >
        {tab === "appointments" ? (
          data && events.length > 0 ? (
            <>
              {/* Stats */}
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
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
                    style={{ background: COLOR_DOT.green as EventColor }}
                  />
                  <div>
                    <div className="text-xl font-semibold tabular-nums">
                      {counts.delivered}
                    </div>
                    <div className="text-xs text-muted-foreground">Delivered</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
                  <Images className="h-4 w-4 text-muted-foreground" aria-hidden />
                  <div>
                    <div className="text-xl font-semibold tabular-nums">
                      {counts.files}
                    </div>
                    <div className="text-xs text-muted-foreground">Files ready</div>
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
                  <Calendar className="mr-1.5 h-4 w-4" aria-hidden />
                  Board
                </Button>
                <Button
                  variant={mode === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleSetMode("list")}
                >
                  <List className="mr-1.5 h-4 w-4" aria-hidden />
                  List
                </Button>
              </div>

              {mode === "board" ? (
                <SharedBoard
                  events={events}
                  onOpenGallery={setGalleryEvent}
                />
              ) : (
                <SharedList
                  events={events}
                  onOpenGallery={setGalleryEvent}
                />
              )}
            </>
          ) : (
            <Empty
              title="No appointments yet"
              sub="Your photographer will share upcoming shoots here."
            />
          )
        ) : null}

        {tab === "pricing" && data ? <SharedPricingView data={data} /> : null}
        </div>
      </div>

      {galleryEvent ? (
        <DeliveryGallery
          title={
            galleryEvent.unit
              ? `${galleryEvent.address ?? galleryEvent.title}, ${galleryEvent.unit}`
              : galleryEvent.address ?? galleryEvent.title ?? "Delivery"
          }
          subtitle={formatSharedDateLong(galleryEvent.date)}
          files={galleryEvent.files ?? []}
          addressHint={galleryEvent.address}
          onClose={() => setGalleryEvent(null)}
        />
      ) : null}
    </div>
  );
}
