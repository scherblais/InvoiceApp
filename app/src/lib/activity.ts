import { ref, set, db } from "@/lib/firebase";

/**
 * All activity entries the client-facing share page can emit. Keep
 * this narrow — every value also lives in the Firebase rules
 * validator so new types require a rules update too.
 */
export type ActivityType =
  | "page_visited"
  | "gallery_opened"
  | "file_downloaded"
  | "files_downloaded_zip";

export interface ActivityEntry {
  id: string;
  type: ActivityType;
  at: number;
  /** Display name snapshot of the client — denormalized so the
   *  photographer's notification feed doesn't need to cross-
   *  reference their client list at render time. */
  clientName?: string;
  /** Short label for the event this activity is about. */
  eventLabel?: string;
  /** For downloads: the file name, or "mls" / "originals" for bulk. */
  fileLabel?: string;
  /** For bulk downloads: how many files were in the zip. */
  fileCount?: number;
}

/**
 * Decode a `shared/<token>` token back into the photographer's uid
 * so the client-facing page can target their activity feed without
 * any auth handshake. Token was generated as
 * `btoa(uid::clientId).replace(/=/g, "")`, so we re-pad and decode.
 */
export function decodeUidFromToken(token: string): string | null {
  try {
    const padded = token + "=".repeat((4 - (token.length % 4)) % 4);
    const decoded = atob(padded);
    const [uid] = decoded.split("::");
    return uid || null;
  } catch {
    return null;
  }
}

/**
 * Write an activity entry to `activity/<uid>/<autoid>`. No-ops if
 * the token can't be decoded — the app never wants an errant activity
 * log to break the UI for a client.
 */
export async function logActivity(
  token: string,
  entry: Omit<ActivityEntry, "id" | "at"> & { at?: number }
): Promise<void> {
  const uid = decodeUidFromToken(token);
  if (!uid) return;
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload: ActivityEntry = {
    id,
    at: entry.at ?? Date.now(),
    type: entry.type,
    ...(entry.clientName ? { clientName: entry.clientName } : {}),
    ...(entry.eventLabel ? { eventLabel: entry.eventLabel } : {}),
    ...(entry.fileLabel ? { fileLabel: entry.fileLabel } : {}),
    ...(entry.fileCount !== undefined ? { fileCount: entry.fileCount } : {}),
  };
  try {
    await set(ref(db, `activity/${uid}/${id}`), payload);
  } catch (err) {
    // Never throw — a missing rule or blocked request shouldn't
    // break the client experience.
    console.warn("activity write failed", err);
  }
}

/** Session-scoped dedupe helper for events that would otherwise fire
 *  more than once per gallery view / page load. */
const loggedThisSession = new Set<string>();

export function logOnce(key: string, write: () => void): void {
  if (loggedThisSession.has(key)) return;
  loggedThisSession.add(key);
  write();
}
