import { useEffect, useState } from "react";
import { ref, onValue, set, off, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

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
    void set(r, next);
    setValue(next);
  };

  return [value, save];
}
