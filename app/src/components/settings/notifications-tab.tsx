import { useEffect, useMemo, useState } from "react";
import { Mail, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import {
  DEFAULT_BODY,
  DEFAULT_SUBJECT,
  PLACEHOLDER_KEYS,
  renderTemplate,
  sampleVariables,
} from "@/lib/booking-email";
import { sendTestBookingEmail } from "@/lib/notifications";
import type { Config, ConfigBookingEmail } from "@/lib/types";

interface NotificationsTabProps {
  config: Config;
  onSave: (next: Config) => void;
}

interface DraftState {
  enabled: boolean;
  fromName: string;
  subject: string;
  body: string;
}

function configToDraft(cfg: ConfigBookingEmail | undefined): DraftState {
  return {
    enabled: cfg?.enabled !== false,
    fromName: cfg?.fromName ?? "",
    subject: cfg?.subject ?? "",
    body: cfg?.body ?? "",
  };
}

function draftToConfig(d: DraftState): ConfigBookingEmail {
  return {
    enabled: d.enabled,
    fromName: d.fromName.trim(),
    subject: d.subject.trim(),
    body: d.body,
  };
}

export function NotificationsTab({ config, onSave }: NotificationsTabProps) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<DraftState>(() =>
    configToDraft(config.bookingEmail)
  );
  const [savedJson, setSavedJson] = useState<string>(() =>
    JSON.stringify(configToDraft(config.bookingEmail))
  );
  const [testEmail, setTestEmail] = useState<string>(
    () => config.email || user?.email || ""
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const next = configToDraft(config.bookingEmail);
    setDraft(next);
    setSavedJson(JSON.stringify(next));
  }, [config.bookingEmail]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== savedJson,
    [draft, savedJson]
  );

  const previewVars = useMemo(() => sampleVariables(config), [config]);
  const previewSubject = useMemo(
    () => renderTemplate(draft.subject.trim() || DEFAULT_SUBJECT, previewVars),
    [draft.subject, previewVars]
  );
  const previewBody = useMemo(
    () => renderTemplate(draft.body.trim() || DEFAULT_BODY, previewVars),
    [draft.body, previewVars]
  );

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  const handleSave = () => {
    onSave({ ...config, bookingEmail: draftToConfig(draft) });
    toast.success("Notification settings saved");
  };

  const handleResetTemplate = () => {
    setDraft((d) => ({ ...d, subject: "", body: "" }));
    toast.info("Template reset to default", {
      description: "Click Save to keep the change.",
    });
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error("Enter an email to send the test to");
      return;
    }
    setSending(true);
    try {
      await sendTestBookingEmail(testEmail, draftToConfig(draft), config);
      toast.success("Test email sent", {
        description: `Check ${testEmail} (and spam) within a few seconds.`,
      });
    } catch (err) {
      toast.error("Test send failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Booking confirmation email</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Sent automatically the first time a calendar event has a date and
              an assigned client with an email on file.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium">
            <Checkbox
              checked={draft.enabled}
              onCheckedChange={(v) => update("enabled", v === true)}
              aria-label="Enable booking confirmation emails"
            />
            <span>{draft.enabled ? "Enabled" : "Disabled"}</span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Sender</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Display name shown next to your sending address in the inbox.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="be-from-name">From name</Label>
          <Input
            id="be-from-name"
            placeholder="Lumeria Media"
            value={draft.fromName}
            onChange={(e) => update("fromName", e.target.value)}
          />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Template</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Use any of the placeholders below. Empty fields fall back to the
              built-in default.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetTemplate}
            className="shrink-0"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to default
          </Button>
        </div>

        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="be-subject">Subject</Label>
            <Input
              id="be-subject"
              placeholder={DEFAULT_SUBJECT}
              value={draft.subject}
              onChange={(e) => update("subject", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="be-body">Body</Label>
            <Textarea
              id="be-body"
              rows={12}
              className="font-mono text-xs"
              placeholder={DEFAULT_BODY}
              value={draft.body}
              onChange={(e) => update("body", e.target.value)}
            />
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Available placeholders
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLACEHOLDER_KEYS.map((k) => (
                <code
                  key={k}
                  className="rounded bg-background px-1.5 py-0.5 text-[11px] font-mono text-foreground"
                >
                  {`{${k}}`}
                </code>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Preview</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Rendered with sample data ({previewVars.clientName} →{" "}
          {previewVars.fullAddress}).
        </p>
        <div className="mt-4 overflow-hidden rounded-md border bg-background">
          <div className="border-b bg-muted/30 px-4 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Subject
            </div>
            <div className="mt-0.5 text-sm font-medium">{previewSubject}</div>
          </div>
          <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-relaxed">
            {previewBody}
          </div>
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="text-sm font-semibold">Send test</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Sends the current draft (saved or not) using the sample data above.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="you@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="sm:flex-1"
          />
          <Button
            variant="outline"
            onClick={handleSendTest}
            disabled={sending}
            className="shrink-0"
          >
            {sending ? (
              <>
                <Mail className="mr-1.5 h-4 w-4 animate-pulse" />
                Sending…
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Send test
              </>
            )}
          </Button>
        </div>
      </section>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 rounded-md border bg-background/95 p-3 backdrop-blur">
        <span className="mr-auto self-center text-xs text-muted-foreground">
          {dirty ? "Unsaved changes" : "All changes saved"}
        </span>
        <Button onClick={handleSave} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
