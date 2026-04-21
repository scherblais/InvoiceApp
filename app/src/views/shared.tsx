import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ref, onValue, off, db } from "@/lib/firebase";
import { logActivity, logOnce } from "@/lib/activity";
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { DeliveryGallery } from "@/components/shared/delivery-gallery";
import {
  SharedSidebar,
  type SharedPageId,
} from "@/components/shared/shared-sidebar";
import { HomePage } from "@/components/shared/pages/home-page";
import { BoardPage } from "@/components/shared/pages/board-page";
import { DeliveriesPage } from "@/components/shared/pages/deliveries-page";
import { PricingPage } from "@/components/shared/pages/pricing-page";
import {
  SharedDataProvider,
  type SharedLanes,
} from "@/contexts/shared-context";
import type { SharedData, SharedEvent } from "@/lib/shared";

// Unused in this file but keeps tree-shaking friendly: Sidebar import
// above pulls the base Sidebar into the bundle, which means the
// shared-side sidebar doesn't duplicate chrome.
void Sidebar;

/** LocalStorage key for last-visited client page — lets the client
 *  come back to where they were without a router. */
const PAGE_KEY = "lumeria_shared_page";

function coerceLanes(events: SharedEvent[]): SharedLanes {
  const out: SharedLanes = {
    received: [],
    pending: [],
    scheduled: [],
    delivered: [],
  };
  for (const ev of events) {
    const s = ev.status ?? "scheduled";
    // Legacy "shooting" and "editing" collapse into Scheduled —
    // matches normalizeStatus on the photographer side.
    const bucket =
      s === "shooting" || s === "editing"
        ? "scheduled"
        : (s as keyof SharedLanes);
    if (bucket in out) {
      out[bucket].push(ev);
    } else {
      out.scheduled.push(ev);
    }
  }
  // Received / Pending / Scheduled sort soonest-first, Delivered
  // newest-first so the freshest gallery lands at the top.
  for (const key of Object.keys(out) as (keyof SharedLanes)[]) {
    const cmp =
      key === "delivered"
        ? (a: SharedEvent, b: SharedEvent) =>
            (b.date || "").localeCompare(a.date || "")
        : (a: SharedEvent, b: SharedEvent) =>
            (a.date || "").localeCompare(b.date || "") ||
            (a.start || "").localeCompare(b.start || "");
    out[key].sort(cmp);
  }
  return out;
}

export function SharedView() {
  const [params] = useSearchParams();
  const token = params.get("share");
  const [data, setData] = useState<SharedData | null>(null);
  // Initialize loading + error from the URL token directly so the missing-
  // token branch doesn't need a setState-in-effect — there's nothing async
  // to wait on if there's no token.
  const [loading, setLoading] = useState<boolean>(!!token);
  const [error, setError] = useState<string | null>(
    token ? null : "Missing share token"
  );
  const [galleryEvent, setGalleryEvent] = useState<SharedEvent | null>(null);
  const [page, setPage] = useState<SharedPageId>(() => {
    const saved = localStorage.getItem(PAGE_KEY) as SharedPageId | null;
    return saved ?? "home";
  });

  useEffect(() => {
    localStorage.setItem(PAGE_KEY, page);
  }, [page]);

  useEffect(() => {
    if (!token) return;
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

  // Fire a one-per-session "page_visited" activity once we have the
  // client's display name in hand, so the photographer's feed reads
  // "Press Realty opened their portal" instead of "A client…".
  useEffect(() => {
    if (!token || !data) return;
    const name = data.realtorName || data.realtorCompany || "A client";
    logOnce(`visit:${token}`, () => {
      void logActivity(token, {
        type: "page_visited",
        clientName: name,
      });
    });
  }, [token, data]);

  const events = useMemo(() => {
    const raw = data?.events ?? [];
    if (Array.isArray(raw)) return raw;
    return Object.values(raw) as SharedEvent[];
  }, [data]);

  const lanes = useMemo(() => coerceLanes(events), [events]);

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

  return (
    <SharedDataProvider
      value={{
        data,
        events,
        lanes,
        openGallery: setGalleryEvent,
      }}
    >
      <SidebarProvider className="h-svh min-h-svh">
        <SharedSidebar active={page} onSelect={setPage} />
        <SidebarInset className="h-svh overflow-hidden">
          {/* Mobile header only — the sidebar collapses into a drawer on
              small screens, so the trigger has to live outside of it. */}
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <span className="text-sm font-semibold">Lumeria Media</span>
          </header>
          <main className="flex-1 overflow-auto">
            <div
              key={page}
              className="h-full animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-out motion-reduce:animate-none"
            >
              {page === "home" ? <HomePage onNavigate={setPage} /> : null}
              {page === "board" ? <BoardPage /> : null}
              {page === "deliveries" ? <DeliveriesPage /> : null}
              {page === "pricing" ? <PricingPage /> : null}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>

      {galleryEvent ? (
        <DeliveryGallery
          title={
            galleryEvent.unit
              ? `${galleryEvent.address ?? galleryEvent.title}, ${galleryEvent.unit}`
              : galleryEvent.address ?? galleryEvent.title ?? "Delivery"
          }
          subtitle={
            galleryEvent.date
              ? new Date(`${galleryEvent.date}T12:00:00`).toLocaleDateString(
                  "en-CA",
                  { weekday: "long", month: "long", day: "numeric" }
                )
              : undefined
          }
          files={galleryEvent.files ?? []}
          addressHint={galleryEvent.address}
          onClose={() => setGalleryEvent(null)}
          token={token ?? undefined}
          clientName={data?.realtorName || data?.realtorCompany}
        />
      ) : null}
    </SharedDataProvider>
  );
}
