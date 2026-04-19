import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { ref, set, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { cn } from "@/lib/utils";

interface BookingPayload {
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
 * Public shoot-request form. URL shape:
 *   /book?to=<photographer-uid>
 * Submission writes to `inquiries/<uid>/<autoId>` — rules allow
 * public creates with tight validation (required fields, size caps).
 * The photographer's dashboard picks it up as a new inquiry in the
 * To Schedule panel.
 *
 * No account creation, no OAuth dance. Just a form. We handle three
 * spam deterrents:
 *   1. Honeypot field (hidden from real users, bots tend to fill it).
 *   2. Minimum 1.5s interaction window — a submission fired in the
 *      first second is almost certainly a bot.
 *   3. Client-side validation before we even touch Firebase.
 */
export function BookingView() {
  const [params] = useSearchParams();
  const uid = params.get("to")?.trim() ?? "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [desiredTime, setDesiredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [honeypot, setHoneypot] = useState(""); // hidden
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedAt = useMemo(() => Date.now(), []);

  const minDate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    document.title = "Book a shoot · Lumeria Media";
  }, []);

  if (!uid) {
    return (
      <MessageScreen
        title="Missing booking link"
        body="This URL is missing the photographer reference. If you copied the link from an email, try using the full URL without edits."
      />
    );
  }

  const canSubmit =
    name.trim().length > 0 && address.trim().length > 0 && !submitting;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    // Honeypot + early-submit = bot.
    if (honeypot) return;
    if (Date.now() - mountedAt < 1500) {
      setError("Please take a moment — we'll accept in a second.");
      return;
    }

    setSubmitting(true);
    const id = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload: BookingPayload = {
      at: Date.now(),
      name: name.trim().slice(0, 200),
      address: address.trim().slice(0, 500),
      ...(email.trim() ? { email: email.trim().slice(0, 200) } : {}),
      ...(phone.trim() ? { phone: phone.trim().slice(0, 60) } : {}),
      ...(company.trim() ? { company: company.trim().slice(0, 200) } : {}),
      ...(desiredDate ? { desiredDate } : {}),
      ...(desiredTime ? { desiredTime } : {}),
      ...(notes.trim() ? { notes: notes.trim().slice(0, 2000) } : {}),
    };

    try {
      await set(ref(db, `inquiries/${uid}/${id}`), payload);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't send your request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <MessageScreen
        icon="success"
        title="Request sent"
        body={`Thanks, ${name.split(" ")[0] || "talk soon"}. Your photographer will be in touch shortly to confirm the shoot. You can close this tab.`}
      />
    );
  }

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5 px-6 py-4 md:px-10">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-foreground text-background">
            <LumeriaLogo className="h-3.5 w-3.5" aria-hidden />
          </div>
          <span className="text-sm font-semibold tracking-tight">
            Lumeria Media
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10 md:px-10 md:py-14">
        {/* Hero */}
        <div className="flex flex-col gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Book a shoot
          </span>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
            Tell us about the listing
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in what you know. We'll reach out to confirm timing,
            package, and price — usually within a business day.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-6">
          {/* Honeypot — hidden from real users, filled by bots. */}
          <label className="sr-only" aria-hidden>
            Leave this field empty
            <input
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </label>

          {/* Your info */}
          <section className="flex flex-col gap-4">
            <SectionHeading icon={User}>Your info</SectionHeading>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" required>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  autoComplete="name"
                />
              </Field>
              <Field label="Company or brokerage" optional>
                <Input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Press Realty"
                  autoComplete="organization"
                />
              </Field>
              <Field label="Email" optional icon={Mail}>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  autoComplete="email"
                />
              </Field>
              <Field label="Phone" optional icon={Phone}>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(514) 555-0123"
                  autoComplete="tel"
                />
              </Field>
            </div>
          </section>

          {/* Listing */}
          <section className="flex flex-col gap-4">
            <SectionHeading icon={Building2}>The listing</SectionHeading>
            <Field label="Address" required>
              <AddressAutocomplete
                value={address}
                onChange={setAddress}
                placeholder="123 Main St, Montreal"
                ariaLabel="Listing address"
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Preferred date" optional icon={Calendar}>
                <Input
                  type="date"
                  min={minDate}
                  value={desiredDate}
                  onChange={(e) => setDesiredDate(e.target.value)}
                />
              </Field>
              <Field label="Preferred time" optional icon={Clock}>
                <Input
                  type="time"
                  value={desiredTime}
                  onChange={(e) => setDesiredTime(e.target.value)}
                />
              </Field>
            </div>
          </section>

          {/* Anything else */}
          <section className="flex flex-col gap-4">
            <SectionHeading>Anything else?</SectionHeading>
            <Field label="Notes" optional>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Square footage, access instructions, any specific shots you have in mind…"
              />
            </Field>
          </section>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3 border-t pt-6 md:flex-row md:justify-between">
            <p className="text-xs text-muted-foreground">
              By submitting you confirm you're authorized to request a shoot
              at this address.
            </p>
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit}
              className="w-full md:w-auto"
            >
              {submitting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {submitting ? "Sending…" : "Send request"}
              {!submitting ? (
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
              ) : null}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  children,
}: {
  icon?: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2">
      {Icon ? (
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      ) : null}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {children}
      </h2>
    </div>
  );
}

function Field({
  label,
  required,
  optional,
  icon: Icon,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon?: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label className="flex items-center gap-1.5">
        {Icon ? (
          <Icon className="h-3 w-3 text-muted-foreground" aria-hidden />
        ) : null}
        <span>{label}</span>
        {required ? (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        ) : null}
        {optional ? (
          <span className="text-[10.5px] font-normal text-muted-foreground">
            optional
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

function MessageScreen({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon?: "success";
}) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center shadow-xs">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            icon === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          {icon === "success" ? (
            <CheckCircle2 className="h-5 w-5" aria-hidden />
          ) : (
            <Building2 className="h-5 w-5" aria-hidden />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{body}</p>
        </div>
      </div>
    </div>
  );
}
