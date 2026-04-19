import { useEffect, useState } from "react";
import { ref, onValue, off, remove, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";

export interface Inquiry {
  id: string;
  at: number;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address: string;
  desiredDate?: string;
  desiredTime?: string;
  notes?: string;
}

/**
 * Subscribes to `inquiries/<uid>` and returns the photographer's
 * pending booking requests (most recent first). Exposes `remove()`
 * so the dashboard can discard or convert an inquiry into a full
 * calendar event.
 */
export function useInquiries(): {
  inquiries: Inquiry[];
  remove: (id: string) => Promise<void>;
} {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);

  useEffect(() => {
    if (!user) {
      setInquiries([]);
      return;
    }
    const r = ref(db, `inquiries/${user.uid}`);
    const listener = onValue(r, (snap) => {
      const val = snap.val() as Record<string, Inquiry> | null;
      if (!val) {
        setInquiries([]);
        return;
      }
      const list = Object.values(val).filter(
        (i): i is Inquiry => !!i && typeof i.at === "number" && !!i.name
      );
      list.sort((a, b) => b.at - a.at);
      setInquiries(list);
    });
    return () => off(r, "value", listener);
  }, [user]);

  const removeInquiry = async (id: string) => {
    if (!user) return;
    await remove(ref(db, `inquiries/${user.uid}/${id}`));
  };

  return { inquiries, remove: removeInquiry };
}
