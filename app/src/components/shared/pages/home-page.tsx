import {
  ArrowRight,
  Calendar,
  Camera,
  DollarSign,
  Images,
  KanbanSquare,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { useSharedData } from "@/contexts/shared-context";
import { formatRelativeDate, formatTime, eventLocation } from "@/components/shared/format-utils";
import type { SharedPageId } from "@/components/shared/shared-sidebar";
import type { SharedEvent } from "@/lib/shared";
import { COLOR_DOT } from "@/lib/calendar";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function nextUpcoming(lanes: ReturnType<typeof useSharedData>["lanes"]): SharedEvent | null {
  const todayISO = new Date().toISOString().slice(0, 10);
  const candidates = [
    ...lanes.received,
    ...lanes.pending,
    ...lanes.scheduled,
  ].filter((e) => e.date && e.date >= todayISO);
  candidates.sort(
    (a, b) =>
      (a.date || "").localeCompare(b.date || "") ||
      (a.start || "").localeCompare(b.start || "")
  );
  return candidates[0] ?? null;
}

/**
 * Client home page — greeting + quick-access cards routing to the
 * other sections. Stays visual and friendly; no kanban, no lists.
 */
export function HomePage({
  onNavigate,
}: {
  onNavigate: (id: SharedPageId) => void;
}) {
  const { data, lanes, openGallery } = useSharedData();
  const name = data?.realtorName || "";
  const company = data?.realtorCompany || "";
  const upcoming = nextUpcoming(lanes);
  const readyCount = lanes.delivered.filter(
    (e) => (e.files?.length ?? 0) > 0
  ).length;
  const mostRecentDelivery =
    lanes.delivered.find((e) => (e.files?.length ?? 0) > 0) ?? null;

  const shootsInMotion =
    lanes.received.length + lanes.pending.length + lanes.scheduled.length;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={`${getGreeting()}${name ? ", " + name : ""}`}
        subtitle={company}
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="flex flex-col gap-6 md:gap-8">
          {/* Next up row */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
            <QuickCard
              icon={Camera}
              label="Latest delivery"
              title={
                mostRecentDelivery
                  ? eventLocation(mostRecentDelivery)
                  : "Nothing delivered yet"
              }
              subtitle={
                mostRecentDelivery
                  ? `${mostRecentDelivery.files?.length ?? 0} files ready`
                  : "You'll see your photos here when shoots wrap up."
              }
              cta={mostRecentDelivery ? "View & download" : undefined}
              onClick={
                mostRecentDelivery
                  ? () => openGallery(mostRecentDelivery)
                  : undefined
              }
              accent={COLOR_DOT.green}
            />
            <QuickCard
              icon={Calendar}
              label="Next shoot"
              title={upcoming ? eventLocation(upcoming) : "Nothing scheduled"}
              subtitle={
                upcoming
                  ? `${formatRelativeDate(upcoming.date ?? "")}${
                      upcoming.start ? " · " + formatTime(upcoming.start) : ""
                    }`
                  : "Your next shoot will show up here once it's booked."
              }
              cta={upcoming ? "Open board" : undefined}
              onClick={upcoming ? () => onNavigate("board") : undefined}
              accent={COLOR_DOT.blue}
            />
          </div>

          {/* Section shortcuts */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            <SectionShortcut
              icon={Images}
              title="Deliveries"
              count={readyCount}
              countLabel={readyCount === 1 ? "gallery" : "galleries"}
              description="Every shoot that's been delivered to you, with full-resolution originals and MLS-ready downloads."
              onClick={() => onNavigate("deliveries")}
            />
            <SectionShortcut
              icon={KanbanSquare}
              title="Board"
              count={shootsInMotion}
              countLabel={shootsInMotion === 1 ? "in motion" : "in motion"}
              description="See every shoot at a glance, grouped by status — received, pending, scheduled, delivered."
              onClick={() => onNavigate("board")}
            />
            <SectionShortcut
              icon={DollarSign}
              title="Pricing"
              count={data?.pricing?.packages.length ?? 0}
              countLabel={
                data?.pricing?.packages.length === 1 ? "package" : "packages"
              }
              description="Your current rate sheet, including any negotiated discounts."
              onClick={() => onNavigate("pricing")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickCard({
  icon: Icon,
  label,
  title,
  subtitle,
  cta,
  onClick,
  accent,
}: {
  icon: typeof Camera;
  label: string;
  title: string;
  subtitle: string;
  cta?: string;
  onClick?: () => void;
  accent: string;
}) {
  const interactive = !!onClick;
  return (
    <Card
      className={
        interactive
          ? "group cursor-pointer gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-sm"
          : "gap-4 p-6 opacity-80"
      }
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-2 w-2 rounded-full"
            style={{ background: accent }}
          />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </div>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-[17px] font-semibold tracking-tight">{title}</h3>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {cta ? (
        <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary">
          {cta}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </div>
      ) : null}
    </Card>
  );
}

function SectionShortcut({
  icon: Icon,
  title,
  count,
  countLabel,
  description,
  onClick,
}: {
  icon: typeof Camera;
  title: string;
  count: number;
  countLabel: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col gap-3 rounded-xl border bg-card p-5 text-left shadow-xs transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-sm"
    >
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">
          {count}
        </span>
        <span className="text-xs text-muted-foreground">{countLabel}</span>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
