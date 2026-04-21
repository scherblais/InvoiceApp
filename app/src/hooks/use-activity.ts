import { useEffect, useState } from "react";
import { ref, onValue, off, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import type { ActivityEntry } from "@/lib/activity";

const LAST_SEEN_KEY = "lumeria_activity_last_seen";

/**
 * Subscribes to the photographer's activity feed (`activity/<uid>`)
 * and returns the most-recent-first list + an "unread" count relative
 * to the last time the user opened the notification bell (tracked in
 * localStorage, per-device).
 *
 * Activity is written by the public share page when clients view
 * galleries / download files / visit the page. See `lib/activity.ts`.
 */
export function useActivityFeed(): {
  entries: ActivityEntry[];
  unread: number;
  markAllRead: () => void;
} {
  const { user } = useAuth();
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  });

  // Reset the cached entries when the signed-in user changes (or signs out).
  // Done in render via the "adjust state on prop change" pattern instead of
  // an effect+setState so there's no extra render cycle. See
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [lastUid, setLastUid] = useState<string | undefined>(user?.uid);
  if (lastUid !== user?.uid) {
    setLastUid(user?.uid);
    setEntries([]);
  }

  useEffect(() => {
    if (!user) return;
    const r = ref(db, `activity/${user.uid}`);
    const listener = onValue(r, (snap) => {
      const val = snap.val() as Record<string, ActivityEntry> | null;
      if (!val) {
        setEntries([]);
        return;
      }
      const list = Object.values(val).filter(
        (e): e is ActivityEntry => !!e && typeof e.at === "number"
      );
      list.sort((a, b) => b.at - a.at);
      setEntries(list.slice(0, 50));
    });
    return () => off(r, "value", listener);
  }, [user]);

  const unread = entries.filter((e) => e.at > lastSeen).length;

  const markAllRead = () => {
    const now = Date.now();
    localStorage.setItem(LAST_SEEN_KEY, String(now));
    setLastSeen(now);
  };

  return { entries, unread, markAllRead };
}
