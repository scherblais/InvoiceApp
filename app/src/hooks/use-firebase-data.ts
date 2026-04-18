import { useEffect, useState } from "react";
import { ref, onValue, set, off, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

/**
 * Recursively strip `undefined` values so Firebase Realtime Database
 * accepts the payload — it rejects any object that contains `undefined`
 * at any depth. Keys pointing at `undefined` are dropped entirely. Arrays
 * keep their positional slots (undefined becomes null) so index-based
 * references stay consistent.
 */
function cleanUndefined<T>(value: T): T {
  if (value === undefined) return null as unknown as T;
  if (value === null) return value;
  if (Array.isArray(value)) {
    return value.map((v) => (v === undefined ? null : cleanUndefined(v))) as unknown as T;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = cleanUndefined(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Subscribes to a path under `users/<uid>/<key>` and returns the current value.
 * If the data is an object from Firebase (sparse array serialization), it's
 * coerced back into an array when asArray is true.
 */
export function useFirebaseData<T>(
  key: string,
  options: { asArray?: boolean; fallback?: T } = {}
): [T | null, (value: T) => void] {
  const { user } = useAuth();
  const [value, setValue] = useState<T | null>(options.fallback ?? null);

  useEffect(() => {
    if (!user) {
      setValue(options.fallback ?? null);
      return;
    }
    const r = ref(db, `users/${user.uid}/${key}`);
    const listener = onValue(r, (snap) => {
      let v = snap.val();
      if (v == null) {
        v = options.asArray ? [] : options.fallback ?? null;
      } else if (options.asArray && !Array.isArray(v)) {
        v = Object.values(v);
      }
      setValue(v as T);
    });
    return () => off(r, "value", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, key]);

  const save = (next: T) => {
    if (!user) return;
    const r = ref(db, `users/${user.uid}/${key}`);
    // Strip undefined before writing — Firebase Realtime DB throws on any
    // nested undefined (e.g. a draft listing with no package selected).
    void set(r, cleanUndefined(next));
    setValue(next);
  };

  return [value, save];
}
