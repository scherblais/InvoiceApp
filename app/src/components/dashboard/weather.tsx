import { useEffect, useState } from "react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    apparent_temperature: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

function codeDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code >= 45 && code <= 48) return "Foggy";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 85 && code <= 86) return "Snow showers";
  if (code >= 95) return "Thunderstorm";
  return "Unknown";
}

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />;
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

const FALLBACK_COORDS = { lat: 45.45, lon: -73.3 };
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchAt = (lat: number, lon: number) => {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,apparent_temperature&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4&temperature_unit=celsius`
      )
        .then((r) => r.json())
        .then((d: WeatherData) => {
          if (!cancelled) setData(d);
        })
        .catch(() => {});
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchAt(pos.coords.latitude, pos.coords.longitude),
        () => fetchAt(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon),
        { timeout: 5000 }
      );
    } else {
      fetchAt(FALLBACK_COORDS.lat, FALLBACK_COORDS.lon);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <Skeleton className="h-9 w-28" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3">
        <WeatherIcon
          code={data.current.weather_code}
          className="h-5 w-5 text-muted-foreground"
        />
        <div className="flex flex-col leading-tight">
          <span className="text-xl font-semibold tracking-tight tabular-nums">
            {Math.round(data.current.temperature_2m)}°
          </span>
          <span className="text-[11px] text-muted-foreground">
            {codeDescription(data.current.weather_code)} · Feels{" "}
            {Math.round(data.current.apparent_temperature)}°
          </span>
        </div>
      </div>
      <div className="hidden md:flex items-center gap-3 border-l pl-4">
        {data.daily.time.slice(1).map((t, i) => {
          const d = new Date(`${t}T12:00:00`);
          return (
            <div
              key={t}
              className="flex flex-col items-center text-[11px] text-muted-foreground"
            >
              <span>{dayNames[d.getDay()]}</span>
              <WeatherIcon
                code={data.daily.weather_code[i + 1]}
                className="h-4 w-4 my-0.5"
              />
              <span className="tabular-nums">
                {Math.round(data.daily.temperature_2m_max[i + 1])}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
