import { useEffect, useMemo, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  Sun,
  Sunrise,
  Wind,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Open-Meteo's typed response — we only read what we use below so
 * the shape stays light. The API returns parallel arrays keyed by
 * day index, which we zip together in `days`.
 */
interface WeatherData {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: 0 | 1;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

function codeDescription(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "—";
}

function WeatherIcon({
  code,
  isDay = 1,
  className,
}: {
  code: number;
  isDay?: 0 | 1;
  className?: string;
}) {
  if (code === 0) return isDay ? <Sun className={className} /> : <Sunrise className={className} />;
  if (code <= 2) return <CloudSun className={className} />;
  if (code === 3) return <Cloud className={className} />;
  if (code >= 45 && code <= 48) return <CloudFog className={className} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle className={className} />;
  if (code >= 61 && code <= 67) return <CloudRain className={className} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={className} />;
  if (code >= 80 && code <= 82) return <CloudRain className={className} />;
  if (code >= 85 && code <= 86) return <CloudSnow className={className} />;
  if (code >= 95) return <CloudLightning className={className} />;
  return <Cloud className={className} />;
}

const FALLBACK = { lat: 45.45, lon: -73.3, label: "Carignan, QC" };

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Weekly weather strip shown on the dashboard. Reports current
 * conditions (temp + feels-like + wind) on the left, then a
 * seven-day grid of icon / high / low / precipitation chance so
 * a photographer can read "is Wednesday a wash?" at a glance.
 *
 * Location resolves via browser geolocation, falling back to
 * Carignan when the user declines or the API times out. The label
 * is reverse-geocoded once per location via Open-Meteo's search API.
 */
export function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);
  const [placeLabel, setPlaceLabel] = useState<string>(FALLBACK.label);

  useEffect(() => {
    let cancelled = false;

    const loadFor = (lat: number, lon: number) => {
      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lon),
        current:
          "temperature_2m,weather_code,apparent_temperature,wind_speed_10m,is_day",
        daily:
          "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
        timezone: "auto",
        forecast_days: "7",
        temperature_unit: "celsius",
        wind_speed_unit: "kmh",
      });
      fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
        .then((r) => r.json())
        .then((d: WeatherData) => {
          if (!cancelled) setData(d);
        })
        .catch(() => {});

      // Reverse-geocode to a human-readable place name. Best-effort
      // — errors here just leave the fallback label.
      fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`
      )
        .then((r) => r.json())
        .then((g: { results?: { name: string; admin1?: string }[] }) => {
          if (cancelled) return;
          const r = g.results?.[0];
          if (r) {
            setPlaceLabel(r.admin1 ? `${r.name}, ${r.admin1}` : r.name);
          }
        })
        .catch(() => {});
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadFor(pos.coords.latitude, pos.coords.longitude),
        () => loadFor(FALLBACK.lat, FALLBACK.lon),
        { timeout: 5000, maximumAge: 1000 * 60 * 30 }
      );
    } else {
      loadFor(FALLBACK.lat, FALLBACK.lon);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const days = useMemo(() => {
    if (!data) return [];
    return data.daily.time.map((t, i) => ({
      iso: t,
      code: data.daily.weather_code[i],
      high: Math.round(data.daily.temperature_2m_max[i]),
      low: Math.round(data.daily.temperature_2m_min[i]),
      precip: Math.round(data.daily.precipitation_probability_max[i] ?? 0),
    }));
  }, [data]);

  if (!data) return <WeatherSkeleton />;

  const current = Math.round(data.current.temperature_2m);
  const feels = Math.round(data.current.apparent_temperature);
  const wind = Math.round(data.current.wind_speed_10m);
  const desc = codeDescription(data.current.weather_code);
  const precipToday = days[0]?.precip ?? 0;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex flex-col gap-5 px-6 py-5 md:flex-row md:items-center md:gap-8">
        {/* Current */}
        <div className="flex items-center gap-4">
          <WeatherIcon
            code={data.current.weather_code}
            isDay={data.current.is_day}
            className="h-10 w-10 shrink-0 text-foreground/80"
            aria-hidden
          />
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-semibold leading-none tracking-tight tabular-nums">
                {current}
              </span>
              <span className="text-lg font-medium leading-none tracking-tight text-muted-foreground">
                °C
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{placeLabel}</span>
            </div>
          </div>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:ml-auto">
          <MetaItem
            label="Conditions"
            value={desc}
          />
          <MetaItem
            label="Feels like"
            value={`${feels}°`}
          />
          <MetaItem
            icon={Wind}
            label="Wind"
            value={`${wind} km/h`}
          />
          <MetaItem
            icon={Droplets}
            label="Rain today"
            value={`${precipToday}%`}
            tone={precipToday >= 60 ? "warn" : "default"}
          />
        </div>
      </div>

      {/* 7-day forecast strip */}
      <div className="border-t">
        <ul className="grid grid-cols-7">
          {days.map((d, i) => (
            <DayCell key={d.iso} day={d} isToday={i === 0} />
          ))}
        </ul>
      </div>
    </Card>
  );
}

function MetaItem({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon?: typeof Wind;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="flex items-center gap-2">
      {Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      ) : null}
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            tone === "warn" && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}

function DayCell({
  day,
  isToday,
}: {
  day: {
    iso: string;
    code: number;
    high: number;
    low: number;
    precip: number;
  };
  isToday: boolean;
}) {
  const d = new Date(`${day.iso}T12:00:00`);
  const label = isToday ? "Today" : DAY_SHORT[d.getDay()];
  const wet = day.precip >= 40;

  return (
    <li
      className={cn(
        "flex flex-col items-center gap-2 border-r border-border px-2 py-4 last:border-r-0",
        isToday && "bg-muted/30"
      )}
    >
      <span
        className={cn(
          "text-[10.5px] font-semibold uppercase tracking-[0.1em]",
          isToday ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {label}
      </span>
      <WeatherIcon
        code={day.code}
        className="h-5 w-5 text-foreground/80"
        aria-hidden
      />
      <div className="flex items-baseline gap-1 text-xs tabular-nums">
        <span className="font-semibold text-foreground">{day.high}°</span>
        <span className="text-muted-foreground">{day.low}°</span>
      </div>
      <div
        className="flex items-center gap-1 text-[10.5px] tabular-nums"
        title={`${day.precip}% chance of precipitation`}
      >
        <Droplets
          className={cn(
            "h-3 w-3 shrink-0",
            wet ? "text-sky-500" : "text-muted-foreground/40"
          )}
          aria-hidden
        />
        <span className={wet ? "font-medium text-foreground" : "text-muted-foreground"}>
          {day.precip}%
        </span>
      </div>
    </li>
  );
}

function WeatherSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="flex items-center gap-4 px-6 py-5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-7 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <div className="ml-auto flex gap-5">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
      <div className="grid grid-cols-7 border-t">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 border-r px-2 py-4 last:border-r-0"
          >
            <Skeleton className="h-2.5 w-8" />
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-2.5 w-10" />
          </div>
        ))}
      </div>
    </Card>
  );
}
