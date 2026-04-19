import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Download,
  Eye,
  Images,
  Inbox,
  Package,
  Sparkles,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useActivityFeed } from "@/hooks/use-activity";
import type { ActivityEntry, ActivityType } from "@/lib/activity";
import { cn } from "@/lib/utils";

/**
 * Notification bell for the photographer's sidebar footer. Opens a
 * popover with a rolling feed of client activity — gallery views,
 * downloads, page visits — written by the public share page via the
 * `logActivity` helper.
 *
 * Unread count is kept in localStorage per device (not synced) so
 * clearing it on one device doesn't race with reads on another.
 */
export function ActivityBell() {
  const { entries, unread, markAllRead } = useActivityFeed();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) markAllRead();
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label={
            unread > 0
              ? `Activity (${unread} unread)`
              : "Activity"
          }
        >
          <Bell className="h-3.5 w-3.5" aria-hidden />
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-primary-foreground tabular-nums"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
            <span className="text-sm font-medium">Activity</span>
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {entries.length} {entries.length === 1 ? "event" : "events"}
          </span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Inbox className="h-4 w-4" aria-hidden />
              </div>
              <p className="text-sm font-medium">Quiet for now</p>
              <p className="max-w-[220px] text-[11px] text-muted-foreground">
                When a client views a gallery or downloads photos, it'll
                show up here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate("/clients");
                    }}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
                  >
                    <ActivityIcon type={entry.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm leading-snug">
                        <span className="font-medium">
                          {entry.clientName || "A client"}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {describe(entry)}
                        </span>
                      </div>
                      {entry.eventLabel ? (
                        <div className="mt-0.5 truncate text-xs text-muted-foreground">
                          {entry.eventLabel}
                        </div>
                      ) : null}
                      <div className="mt-1 text-[10.5px] text-muted-foreground/80 tabular-nums">
                        {timeAgo(entry.at)}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ActivityIcon({ type }: { type: ActivityType }) {
  const base =
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md";
  if (type === "gallery_opened") {
    return (
      <div
        className={cn(
          base,
          "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        )}
      >
        <Eye className="h-3.5 w-3.5" aria-hidden />
      </div>
    );
  }
  if (type === "file_downloaded") {
    return (
      <div className={cn(base, "bg-primary/10 text-primary")}>
        <Download className="h-3.5 w-3.5" aria-hidden />
      </div>
    );
  }
  if (type === "files_downloaded_zip") {
    return (
      <div className={cn(base, "bg-primary/10 text-primary")}>
        <Package className="h-3.5 w-3.5" aria-hidden />
      </div>
    );
  }
  if (type === "page_visited") {
    return (
      <div className={cn(base, "bg-muted text-muted-foreground")}>
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
      </div>
    );
  }
  return (
    <div className={cn(base, "bg-muted text-muted-foreground")}>
      <Images className="h-3.5 w-3.5" aria-hidden />
    </div>
  );
}

function describe(entry: ActivityEntry): string {
  switch (entry.type) {
    case "gallery_opened":
      return "viewed a gallery";
    case "file_downloaded":
      return entry.fileLabel
        ? `downloaded ${entry.fileLabel}`
        : "downloaded a file";
    case "files_downloaded_zip":
      return entry.fileCount
        ? `downloaded ${entry.fileCount} ${entry.fileLabel ?? "files"}`
        : `downloaded ${entry.fileLabel ?? "files"}`;
    case "page_visited":
      return "opened their portal";
    default:
      return "did something";
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const date = new Date(ts);
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
