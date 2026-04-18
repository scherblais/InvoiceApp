import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import {
  Calendar,
  Camera,
  FileText,
  Loader2,
  MapPin,
} from "lucide-react";
import { LumeriaLogo } from "@/components/lumeria-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";

/**
 * Left-hand brand panel on the login split. Decorative on desktop,
 * hidden on mobile where the compact brand header above the form does
 * the same job with less scroll.
 */
function BrandPanel() {
  return (
    <div className="relative hidden h-full overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-10">
      {/* Soft radial halo so the flat primary color has depth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary-foreground/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-primary-foreground/5 blur-3xl"
      />

      <div className="relative flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-foreground/10">
          <LumeriaLogo className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Lumeria Media
        </span>
      </div>

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">
            Invoicing + scheduling,
            <br />
            built for photographers.
          </h2>
          <p className="max-w-md text-sm text-primary-foreground/70">
            Keep every shoot, invoice, and client relationship in one
            place — from the drive to the listing to the wire transfer.
          </p>
        </div>
        <ul className="flex flex-col gap-3 text-sm text-primary-foreground/80">
          <li className="flex items-center gap-2.5">
            <Camera className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span>Track every shoot through delivery</span>
          </li>
          <li className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span>Invoice with the right tax every time</span>
          </li>
          <li className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span>Auto travel fees from your door</span>
          </li>
          <li className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span>One calendar for shoots and edits</span>
          </li>
        </ul>
      </div>

      <div className="relative text-xs text-primary-foreground/60">
        © {new Date().getFullYear()} Lumeria Media
      </div>
    </div>
  );
}

export function LoginView() {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  if (!loading && user) return <Navigate to="/" replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      navigate("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.replace(/^Firebase: /, "")
          : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <BrandPanel />
      <div className="flex min-h-svh items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          {/* Mobile brand header — hidden on desktop where BrandPanel
              handles branding. */}
          <div className="mb-8 flex flex-col items-center gap-2.5 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LumeriaLogo className="h-5 w-5" />
            </div>
            <div className="text-center">
              <div className="text-base font-semibold tracking-tight">
                Lumeria Media
              </div>
              <div className="text-xs text-muted-foreground">
                Invoicing for photographers
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-semibold tracking-tight">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isSignUp
                ? "Enter your email and a password to get started."
                : "Sign in to pick up where you left off."}
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {!isSignUp ? (
                  <span className="text-[11px] text-muted-foreground">
                    6+ characters
                  </span>
                ) : null}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {busy
                ? isSignUp
                  ? "Creating account…"
                  : "Signing in…"
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center text-xs text-muted-foreground">
            <span>
              {isSignUp
                ? "Already have an account?"
                : "Need an account?"}
            </span>
            <button
              type="button"
              className="ml-1 font-medium text-foreground underline-offset-2 hover:underline"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
