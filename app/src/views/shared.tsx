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
  Sparkles,
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

const STATUS_COPY: Record<
  string,
  { label: string; dot: string; chip: string }
> = {
  received: {
    label: "Received",
    dot: COLOR_DOT.rose,
    chip: "Received",
  },
  pending: {
    label: "Pending",
    dot: COLOR_DOT.pink,
    chip: "Confirming",
  },
  scheduled: {
    label: "Scheduled",
    dot: COLOR_DOT.blue,
    chip: "Scheduled",
  },
  delivered: {
    label: "Delivered",
    dot: COLOR_DOT.green,
    chip: "Delivered",
  },
};

function statusMeta(status: string | undefined) {
  const key = status && STATUS_COPY[status] ? status : "scheduled";
  return STATUS_COPY[key];
}

function formatSharedTime(t?: string): string {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hr12 = h % 12 || 12;
  return `${hr12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatWeekday(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  const today = new Date();
  const todayISO = today.toISOString().split("T")[0];
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  if (iso === todayISO) return "Today";
  if (iso === tomorrowISO) return "Tomorrow";
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
  });
}

function formatMonthDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function formatFullDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
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

function eventLocation(ev: SharedEvent): string {
  if (ev.unit && ev.address) return `${ev.address}, ${ev.unit}`;
  return ev.address ?? ev.title ?? "Untitled";
}

/**
 * Welcome hero. Large, quiet, confident — the client's name sits as
 * a display heading, with a thin stat line underneath that avoids
 * the "SaaS dashboard" feel of a row of stat cards.
 */
function Hero({
  name,
  company,
  upcoming,
  ready,
}: {
  name: string;
  company: string;
  upcoming: number;
  ready: number;
}) {
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <section className="flex flex-col gap-5 pb-2">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted-foreground">{greet},</span>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          {name || "Welcome"}
        </h1>
        {company ? (
          <p className="text-sm text-muted-foreground">{company}</p>
        ) : null}
      </div>
      {upcoming + ready > 0 ? (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
          {ready > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Camera
                className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {ready}
                </span>{" "}
                {ready === 1 ? "delivery ready" : "deliveries ready"}
              </span>
            </span>
          ) : null}
          {upcoming > 0 ? (
            <span className="inline-flex items-center gap-2">
              <Calendar
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden
              />
              <span>
                <span className="font-medium text-foreground tabular-nums">
                  {upcoming}
                </span>{" "}
                {upcoming === 1 ? "shoot coming up" : "shoots coming up"}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * The payoff section — delivered shoots with real photo thumbnails.
 * This is what the client came here for, so it leads with visuals
 * instead of metadata.
 */
function ReadySection({
  events,
  onOpenGallery,
}: {
  events: SharedEvent[];
  onOpenGallery: (ev: SharedEvent) => void;
}) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionLabel icon={Sparkles}>Ready for you</SectionLabel>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {events.map((ev) => (
          <li key={`${ev.date}-${ev.address}`}>
            <ReadyCard ev={ev} onOpen={() => onOpenGallery(ev)} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReadyCard({ ev, onOpen }: { ev: SharedEvent; onOpen: () => void }) {
  const photos = (ev.files ?? []).filter((f) => f.kind === "photo");
  const videoCount = (ev.files ?? []).filter((f) => f.kind === "video").length;
  const thumbs = photos.slice(0, 4);
  const overflow = photos.length - thumbs.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
    >
      {/* Thumbnail mosaic */}
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
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">
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
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted/60 text-muted-foreground">
          <ImageIcon className="h-8 w-8" aria-hidden />
        </div>
      )}

      {/* Details */}
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold tracking-tight">
              {eventLocation(ev)}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatFullDate(ev.date)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {photos.length ? (
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="h-3 w-3" aria-hidden />
                <span className="tabular-nums">{photos.length}</span>{" "}
                {photos.length === 1 ? "photo" : "photos"}
              </span>
            ) : null}
            {videoCount ? (
              <span className="inline-flex items-center gap-1">
                <span className="tabular-nums">{videoCount}</span>{" "}
                {videoCount === 1 ? "video" : "videos"}
              </span>
            ) : null}
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            View &amp; download
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </button>
  );
}

/**
 * Forward-looking list of shoots that are scheduled but not yet
 * delivered. Simpler than a kanban — clients think in dates, not
 * workflow columns.
 */
function UpcomingSection({ events }: { events: SharedEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <SectionLabel icon={Calendar}>Coming up</SectionLabel>
      <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
        {events.map((ev, i) => {
          const meta = statusMeta(ev.status);
          return (
            <li
              key={`${ev.date}-${ev.address}-${i}`}
              className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:gap-6"
            >
              <div className="flex shrink-0 items-start gap-3 md:w-44">
                <div className="flex flex-col">
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {formatWeekday(ev.date)}
                  </span>
                  <span className="text-sm font-semibold tracking-tight">
                    {formatMonthDay(ev.date)}
                  </span>
                  {ev.start ? (
                    <span className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                      {formatSharedTime(ev.start)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{eventLocation(ev)}</div>
                {ev.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ev.notes}
                  </p>
                ) : null}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: meta.dot }}
                  aria-hidden
                />
                {meta.chip}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: typeof Sparkles;
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

  // Split events into "ready" (delivered, has files) and "upcoming"
  // (anything not yet delivered, sorted soonest-first).
  const { readyEvents, upcomingEvents } = useMemo(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    const ready: SharedEvent[] = [];
    const upcoming: SharedEvent[] = [];
    for (const ev of events) {
      const isDelivered =
        ev.status === "delivered" && (ev.files?.length ?? 0) > 0;
      if (isDelivered) {
        ready.push(ev);
      } else if (ev.date >= todayISO) {
        upcoming.push(ev);
      }
    }
    // Ready: newest first (most recent delivery at the top).
    ready.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    // Upcoming: earliest first.
    upcoming.sort(
      (a, b) =>
        (a.date || "").localeCompare(b.date || "") ||
        (a.start || "").localeCompare(b.start || "")
    );
    return { readyEvents: ready, upcomingEvents: upcoming };
  }, [events]);

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-10">
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

      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 md:gap-14 md:px-10 md:py-14">
        <Hero
          name={name}
          company={company}
          upcoming={upcomingEvents.length}
          ready={readyEvents.length}
        />

        {!hasContent ? <EmptyState /> : null}

        <ReadySection events={readyEvents} onOpenGallery={setGalleryEvent} />

        <UpcomingSection events={upcomingEvents} />

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
