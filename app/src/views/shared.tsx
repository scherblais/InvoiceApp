import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  Camera,
  DollarSign,
  Image as ImageIcon,
  Images,
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
import { COLOR_DOT } from "@/lib/calendar";
import type { SharedData, SharedEvent } from "@/lib/shared";
import { cn } from "@/lib/utils";

/** The four lanes of the client board. Order matches the workflow
 *  left-to-right: inbound → confirming → booked → done. */
const LANES: {
  id: "received" | "pending" | "scheduled" | "delivered";
  label: string;
  dot: string;
  emptyCopy: string;
}[] = [
  { id: "received", label: "Received", dot: COLOR_DOT.rose, emptyCopy: "No new inquiries yet." },
  { id: "pending", label: "Pending", dot: COLOR_DOT.pink, emptyCopy: "Nothing pending." },
  { id: "scheduled", label: "Scheduled", dot: COLOR_DOT.blue, emptyCopy: "Nothing booked here." },
  { id: "delivered", label: "Delivered", dot: COLOR_DOT.green, emptyCopy: "No deliveries yet." },
];

function laneFor(status: string | undefined): (typeof LANES)[number] {
  const s = status ?? "scheduled";
  // Legacy "shooting" and "editing" collapse into Scheduled — same
  // logic the internal dashboard normalizeStatus applies.
  const bucket =
    s === "shooting" || s === "editing"
      ? "scheduled"
      : (s as (typeof LANES)[number]["id"]);
  return LANES.find((l) => l.id === bucket) ?? LANES[2];
}

function formatTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${hr12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatFullDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatRelativeDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  if (iso === todayISO) return "Today";
  if (iso === tomorrowISO) return "Tomorrow";
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

function formatDollar(value: number): string {
  return value.toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  });
}

function eventLocation(ev: SharedEvent): string {
  if (ev.unit && ev.address) return `${ev.address}, ${ev.unit}`;
  return ev.address ?? ev.title ?? "Untitled";
}

function Hero({
  name,
  company,
  totals,
}: {
  name: string;
  company: string;
  totals: { ready: number; upcoming: number };
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{greet},</span>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {name || "Welcome"}
        </h1>
        {company ? (
          <p className="text-sm text-muted-foreground">{company}</p>
        ) : null}
      </div>
      {totals.ready + totals.upcoming > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {totals.ready > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Camera
                className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {totals.ready}
                </span>{" "}
                {totals.ready === 1 ? "delivery ready" : "deliveries ready"}
              </span>
            </span>
          ) : null}
          {totals.upcoming > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Calendar
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {totals.upcoming}
                </span>{" "}
                {totals.upcoming === 1 ? "shoot coming up" : "shoots coming up"}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The client-facing board — four lanes arranged left-to-right on
 * desktop (Received / Pending / Scheduled / Delivered), stacking
 * into two columns on tablet and a single column on mobile.
 *
 * Cards in the Delivered lane carry a photo mosaic when files are
 * present, so the visual delivery experience is built into the same
 * board instead of living in a separate section.
 */
function Board({
  lanes,
  onOpenGallery,
}: {
  lanes: Record<(typeof LANES)[number]["id"], SharedEvent[]>;
  onOpenGallery: (ev: SharedEvent) => void;
}) {
  return (
    <section className="flex flex-col gap-4">
      <SectionLabel icon={Calendar}>Your board</SectionLabel>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {LANES.map((lane) => (
          <Lane
            key={lane.id}
            lane={lane}
            events={lanes[lane.id] ?? []}
            onOpenGallery={onOpenGallery}
          />
        ))}
      </div>
    </section>
  );
}

function Lane({
  lane,
  events,
  onOpenGallery,
}: {
  lane: (typeof LANES)[number];
  events: SharedEvent[];
  onOpenGallery: (ev: SharedEvent) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-xs">
      <header className="flex items-center gap-2 px-1 pt-1 pb-2">
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: lane.dot }}
        />
        <span className="text-sm font-semibold">{lane.label}</span>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {events.length}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {events.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-background/30 px-3 py-10 text-center">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full opacity-60"
              style={{ background: lane.dot }}
            />
            <p className="text-xs text-muted-foreground">{lane.emptyCopy}</p>
          </div>
        ) : (
          events.map((ev, i) =>
            lane.id === "delivered" ? (
              <DeliveredCard
                key={`${ev.date}-${ev.address}-${i}`}
                ev={ev}
                onOpen={() => onOpenGallery(ev)}
              />
            ) : (
              <UpcomingCard key={`${ev.date}-${ev.address}-${i}`} ev={ev} />
            )
          )
        )}
      </div>
    </div>
  );
}

function UpcomingCard({ ev }: { ev: SharedEvent }) {
  return (
    <div className="rounded-md border bg-background/40 p-3">
      <div className="text-sm font-medium">{eventLocation(ev)}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
        {ev.date ? (
          <>
            <Calendar className="h-3 w-3 shrink-0" aria-hidden />
            <span className="tabular-nums">{formatRelativeDate(ev.date)}</span>
          </>
        ) : (
          <span className="font-medium">TBD</span>
        )}
        {ev.start ? <span className="tabular-nums">· {formatTime(ev.start)}</span> : null}
      </div>
      {ev.notes ? (
        <p className="mt-2 text-xs text-muted-foreground">{ev.notes}</p>
      ) : null}
    </div>
  );
}

function DeliveredCard({
  ev,
  onOpen,
}: {
  ev: SharedEvent;
  onOpen: () => void;
}) {
  const photos = (ev.files ?? []).filter((f) => f.kind === "photo");
  const videos = (ev.files ?? []).filter((f) => f.kind === "video");
  const thumbs = photos.slice(0, 3);
  const overflow = photos.length - thumbs.length;
  const hasMedia = thumbs.length > 0 || videos.length > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!hasMedia}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-md border bg-background/40 text-left transition-all",
        hasMedia
          ? "hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
          : "cursor-default opacity-80"
      )}
    >
      {thumbs.length > 0 ? (
        <div
          className={cn(
            "grid gap-px bg-border",
            thumbs.length === 1 && "grid-cols-1",
            thumbs.length === 2 && "grid-cols-2",
            thumbs.length >= 3 && "grid-cols-[2fr_1fr]"
          )}
        >
          {thumbs.length >= 3 ? (
            <>
              <div className="aspect-[4/3] bg-muted">
                <img
                  src={thumbs[0].compressed?.url ?? thumbs[0].original.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
              <div className="grid grid-rows-2 gap-px">
                {thumbs.slice(1, 3).map((t, i) => (
                  <div key={i} className="relative bg-muted">
                    <img
                      src={t.compressed?.url ?? t.original.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                    />
                    {i === 1 && overflow > 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs font-semibold text-white">
                        +{overflow}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            thumbs.map((t, i) => (
              <div
                key={i}
                className="aspect-[4/3] bg-muted overflow-hidden"
              >
                <img
                  src={t.compressed?.url ?? t.original.url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                />
              </div>
            ))
          )}
        </div>
      ) : null}
      <div className="flex flex-col gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            {eventLocation(ev)}
          </h3>
          {ev.date ? (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {formatShortDate(ev.date)}
            </p>
          ) : null}
        </div>
        {hasMedia ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {photos.length ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <ImageIcon className="h-3 w-3" aria-hidden />
                  {photos.length}
                </span>
              ) : null}
              {videos.length ? (
                <span className="tabular-nums">{videos.length} video</span>
              ) : null}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
              View
              <ArrowRight
                className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            Files will appear once delivered.
          </p>
        )}
      </div>
    </button>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h2>
    </div>
  );
}

function PricingSection({ data }: { data: SharedData }) {
  const pricing = data.pricing;
  if (!pricing) return null;

  return (
    <section className="flex flex-col gap-4">
      <SectionLabel icon={PackageIcon}>Your pricing</SectionLabel>

      {pricing.discount ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Packages
          </h3>
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
            {pricing.packages.map((p) => (
              <li key={p.id} className="flex items-center gap-4 p-4">
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
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">Add-ons</h3>
          <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
            {pricing.addons.map((a) => (
              <li key={a.id} className="flex items-center gap-4 p-4">
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
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Taxes (GST 5% + QST 9.975%) added on the invoice.
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-14 text-center shadow-xs">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
        <Calendar className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-medium">Nothing here yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your photographer will share upcoming shoots and deliveries here.
        </p>
      </div>
    </div>
  );
}

export function SharedView() {
  const [params] = useSearchParams();
  const token = params.get("share");
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const events = useMemo(() => {
    const raw = data?.events ?? [];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw) as SharedEvent[];
  }, [data]);

  const lanes = useMemo(() => {
    const out: Record<
      (typeof LANES)[number]["id"],
      SharedEvent[]
    > = {
      received: [],
      pending: [],
      scheduled: [],
      delivered: [],
    };
    for (const ev of events) {
      const lane = laneFor(ev.status);
      out[lane.id].push(ev);
    }
    // Sort within each lane: non-delivered by date ascending (soonest
    // first), delivered by date descending (most recent delivery
    // first so the freshest shoot is front-and-center).
    for (const id of Object.keys(out) as (keyof typeof out)[]) {
      const cmp =
        id === "delivered"
          ? (a: SharedEvent, b: SharedEvent) =>
              (b.date || "").localeCompare(a.date || "")
          : (a: SharedEvent, b: SharedEvent) =>
              (a.date || "").localeCompare(b.date || "") ||
              (a.start || "").localeCompare(b.start || "");
      out[id].sort(cmp);
    }
    return out;
  }, [events]);

  const totals = useMemo(() => {
    const ready = lanes.delivered.filter(
      (ev) => (ev.files?.length ?? 0) > 0
    ).length;
    const upcoming =
      lanes.received.length + lanes.pending.length + lanes.scheduled.length;
    return { ready, upcoming };
  }, [lanes]);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 bg-background p-6 text-center">
        <p className="text-sm font-medium">Can't load this page</p>
        <p className="text-sm text-muted-foreground">
          {error ?? "This share link is missing or invalid."}
        </p>
      </div>
    );
  }

  const name = data?.realtorName || "";
  const company = data?.realtorCompany || "";
  const hasContent = events.length > 0 || !!data?.pricing;

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[96rem] items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
              <LumeriaLogo className="h-3.5 w-3.5" aria-hidden />
            </div>
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

      <div className="mx-auto flex max-w-[96rem] flex-col gap-10 px-6 py-10 md:gap-14 md:px-10 md:py-14">
        <Hero name={name} company={company} totals={totals} />

        {!hasContent ? (
          <EmptyState />
        ) : events.length > 0 ? (
          <Board lanes={lanes} onOpenGallery={setGalleryEvent} />
        ) : null}

        {data ? <PricingSection data={data} /> : null}

        <footer className="mt-4 border-t pt-6 text-center text-[11px] text-muted-foreground">
          <div className="flex items-center justify-center gap-1.5">
            <Images className="h-3 w-3" aria-hidden />
            <span>Delivered by Lumeria Media</span>
          </div>
        </footer>
      </div>

      {galleryEvent ? (
        <DeliveryGallery
          title={eventLocation(galleryEvent)}
          subtitle={formatFullDate(galleryEvent.date)}
          files={galleryEvent.files ?? []}
          addressHint={galleryEvent.address}
          onClose={() => setGalleryEvent(null)}
        />
      ) : null}
    </div>
  );
}
