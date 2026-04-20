import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Mail,
  MapPin,
  Navigation,
  NotebookText,
  Phone,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DEFAULT_TRAVEL_ORIGIN,
  computeDriveInfo,
  hasMapsApiKey,
} from "@/lib/maps";
import { formatTime12 } from "@/lib/format";
import type { CalEvent, Client, Config } from "@/lib/types";

interface PreShootBriefProps {
  event: CalEvent;
  client?: Client | null;
  config: Config;
}

interface DriveInfo {
  km: number;
  durationMinutes: number;
}

/**
 * Pre-shoot briefing. The card the photographer pins to the top of
 * their dashboard on the morning of a shoot — everything they need
 * before loading the car in one glance:
 *
 *   - Countdown to start time
 *   - Full address + one-click open in Google Maps (driving)
 *   - Auto-computed drive distance + duration from the configured
 *     travel origin via the Distance Matrix API we already use for
 *     travel fee calculation
 *   - Weather signal (today's code + temp, fetched alongside)
 *   - Contact: tap to call, tap to email
 *   - Any gate codes / notes from the event
 *
 * Shows when a non-delivered shoot starts within the next 4 hours
 * (or is currently underway). Goes away once the shoot is an hour
 * past start — the Today list takes over from there.
 */
export function PreShootBrief({ event, client, config }: PreShootBriefProps) {
  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [weather, setWeather] = useState<
    { code: number; temp: number; feels: number } | null
  >(null);
  const [now, setNow] = useState<Date>(() => new Date());

  const origin = config.travel?.origin || DEFAULT_TRAVEL_ORIGIN;
  const address = useMemo(() => {
    if (!event.address) return "";
    return event.unit ? `${event.address}, ${event.unit}` : event.address;
  }, [event.address, event.unit]);

  const startMin = event.start ? toMinutes(event.start) : null;
  const countdown = useMemo(() => {
    if (!startMin || !event.date) return null;
    const [y, m, d] = event.date.split("-").map(Number);
    const start = new Date(y, (m || 1) - 1, d || 1);
    start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);
    const diffMs = start.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60000);
    return { diffMin, start };
  }, [startMin, event.date, now]);

  // Recompute the countdown on a one-minute tick. Cheap — just a
  // Date.now() refresh, no API calls.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!address || !hasMapsApiKey()) return;
    let cancelled = false;
    computeDriveInfo(origin, address)
      .then((info) => {
        if (cancelled) return;
        if (!info) {
          setDriveError("Couldn't compute drive time");
          return;
        }
        setDriveInfo({
          km: info.km,
          durationMinutes: Math.round(info.durationSeconds / 60),
        });
      })
      .catch(() => {
        if (!cancelled) setDriveError("Couldn't compute drive time");
      });
    return () => {
      cancelled = true;
    };
  }, [origin, address]);

  // Fetch today's weather at the event address via Open-Meteo's
  // geocoding + weather API. Quiet degrade if no network / bad
  // address: the card just doesn't show the weather row.
  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    )
      .then((r) => r.json())
      .then(
        (g: {
          results?: { latitude: number; longitude: number }[];
        }) => {
          const r = g.results?.[0];
          if (!r || cancelled) return;
          return fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${r.latitude}&longitude=${r.longitude}&current=temperature_2m,weather_code,apparent_temperature&timezone=auto`
          );
        }
      )
      .then((res) => res?.json())
      .then(
        (d?: {
          current: {
            temperature_2m: number;
            weather_code: number;
            apparent_temperature: number;
          };
        }) => {
          if (cancelled || !d) return;
          setWeather({
            code: d.current.weather_code,
            temp: Math.round(d.current.temperature_2m),
            feels: Math.round(d.current.apparent_temperature),
          });
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [address]);

  const mapsHref = address
    ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(address)}&travelmode=driving`
    : null;

  const contactPhone = (event as { contactPhone?: string }).contactPhone;
  const contactEmail = (event as { contactEmail?: string }).contactEmail;

  const countdownLabel = countdown
    ? formatCountdown(countdown.diffMin)
    : "Up next";

  return (
    <Card className="relative overflow-hidden gap-0 p-0 shadow-sm">
      <div className="relative flex flex-col gap-2 overflow-hidden border-b bg-gradient-to-br from-primary/5 to-transparent px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div className="relative flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Pre-shoot brief
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-[17px] font-semibold tracking-tight">
                {countdownLabel}
              </span>
              {event.start ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  · {formatTime12(event.start)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {mapsHref ? (
          <Button asChild size="sm" className="shrink-0">
            <a href={mapsHref} target="_blank" rel="noreferrer">
              <Navigation className="mr-1.5 h-4 w-4" aria-hidden />
              Open in Maps
            </a>
          </Button>
        ) : null}
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 gap-0 divide-y md:grid-cols-2 md:divide-y-0 md:divide-x">
        {/* Address */}
        <BriefRow icon={MapPin} label="Address">
          {address ? (
            <a
              href={mapsHref ?? "#"}
              target="_blank"
              rel="noreferrer"
              className="truncate text-sm font-medium hover:underline"
            >
              {address}
            </a>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          )}
        </BriefRow>

        {/* Drive */}
        <BriefRow icon={Car} label="Drive from origin">
          {driveInfo ? (
            <span className="text-sm font-medium tabular-nums">
              {driveInfo.durationMinutes} min
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {driveInfo.km.toFixed(1)} km
              </span>
            </span>
          ) : driveError ? (
            <span className="text-xs text-muted-foreground">{driveError}</span>
          ) : hasMapsApiKey() ? (
            <span className="text-xs text-muted-foreground">Computing…</span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Configure Maps to see drive time
            </span>
          )}
        </BriefRow>

        {/* Weather */}
        <BriefRow icon={weather ? weatherIcon(weather.code) : Cloud} label="Weather">
          {weather ? (
            <span className="text-sm font-medium tabular-nums">
              {weather.temp}°
              <span className="ml-1.5 font-normal text-muted-foreground">
                · feels {weather.feels}° · {codeLabel(weather.code)}
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </BriefRow>

        {/* Contact */}
        <BriefRow icon={Phone} label="Contact">
          {event.contactName || contactPhone || contactEmail ? (
            <div className="flex flex-col gap-0.5">
              {event.contactName ? (
                <span className="text-sm font-medium">
                  {event.contactName}
                </span>
              ) : null}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                {contactPhone ? (
                  <a
                    href={`tel:${contactPhone.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3 w-3" aria-hidden />
                    {contactPhone}
                  </a>
                ) : null}
                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3 w-3" aria-hidden />
                    {contactEmail}
                  </a>
                ) : null}
              </div>
            </div>
          ) : client ? (
            <span className="text-sm text-muted-foreground">
              Client: {client.name || client.company}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No contact</span>
          )}
        </BriefRow>
      </div>

      {/* Notes (gate codes etc.) */}
      {event.notes ? (
        <div className="flex items-start gap-3 border-t bg-muted/20 px-6 py-4">
          <NotebookText
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Notes
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
              {event.notes}
            </p>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function BriefRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Car;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 px-6 py-4">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function formatCountdown(diffMin: number): string {
  if (diffMin <= -60) return "Earlier today";
  if (diffMin < -1) return `Started ${Math.abs(diffMin)} min ago`;
  if (diffMin <= 1) return "Starting now";
  if (diffMin < 60) return `In ${diffMin} min`;
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  if (m === 0) return h === 1 ? "In 1 hour" : `In ${h} hours`;
  return `In ${h}h ${m}m`;
}

function codeLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Thunderstorm";
  return "—";
}

function weatherIcon(code: number) {
  if (code === 0) return Sun;
  if (code <= 2) return CloudSun;
  if (code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 57) return CloudDrizzle;
  if (code >= 61 && code <= 67) return CloudRain;
  if (code >= 71 && code <= 77) return CloudSnow;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 85 && code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

