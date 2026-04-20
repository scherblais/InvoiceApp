import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

/**
 * Travel origin — where the photographer departs from. Every travel-fee
 * calculation uses this as the starting point. Settings (Travel section)
 * can override this per-account.
 */
export const DEFAULT_TRAVEL_ORIGIN = "Carignan, QC, Canada";

/**
 * Vite injects `import.meta.env.VITE_GOOGLE_MAPS_API_KEY` at build time.
 * When the variable is missing the app still works — the autocomplete
 * inputs fall back to plain text fields and travel fees are entered
 * manually. This keeps contributors able to run the app without a key.
 */
export function getMapsApiKey(): string {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  return typeof key === "string" ? key.trim() : "";
}

export function hasMapsApiKey(): boolean {
  return getMapsApiKey().length > 0;
}

// Single setup — `setOptions` must be called exactly once before any
// `importLibrary` call. We cache library promises so repeat callers
// don't kick off fresh network requests.
let optionsSet = false;
let placesPromise: Promise<google.maps.PlacesLibrary> | null = null;
let routesPromise: Promise<google.maps.RoutesLibrary> | null = null;
let loaderFailed = false;

function ensureOptions(): boolean {
  if (loaderFailed) return false;
  if (!hasMapsApiKey()) return false;
  if (!optionsSet) {
    setOptions({ key: getMapsApiKey(), v: "weekly" });
    optionsSet = true;
  }
  return true;
}

async function getPlaces(): Promise<google.maps.PlacesLibrary | null> {
  if (!ensureOptions()) return null;
  if (!placesPromise) {
    placesPromise = importLibrary("places").catch((err) => {
      console.error("Google Maps places library failed to load", err);
      loaderFailed = true;
      placesPromise = null;
      throw err;
    });
  }
  try {
    return await placesPromise;
  } catch {
    return null;
  }
}

async function getRoutes(): Promise<google.maps.RoutesLibrary | null> {
  if (!ensureOptions()) return null;
  if (!routesPromise) {
    routesPromise = importLibrary("routes").catch((err) => {
      console.error("Google Maps routes library failed to load", err);
      loaderFailed = true;
      routesPromise = null;
      throw err;
    });
  }
  try {
    return await routesPromise;
  } catch {
    return null;
  }
}

/**
 * Result of a successful place-picked event. `formatted` is what goes in
 * the text input; `location` is what we feed to the distance matrix.
 */
export interface PickedPlace {
  formatted: string;
  shortAddress: string; // street number + route, e.g. "123 Main St"
  city?: string;
  location: google.maps.LatLngLiteral;
  placeId: string;
}

function extractComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string
): string | undefined {
  return components?.find((c) => c.types.includes(type))?.long_name;
}

function extractComponentShort(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string
): string | undefined {
  return components?.find((c) => c.types.includes(type))?.short_name;
}

/**
 * Pull a short "street number + route" address out of a Place — just
 * the street line, used when we deliberately want to hide city/province
 * (e.g. kanban card labels, chip truncation).
 */
export function shortAddressFromPlace(
  place: google.maps.places.PlaceResult
): string {
  const num = extractComponent(place.address_components, "street_number");
  const route = extractComponent(place.address_components, "route");
  if (num && route) return `${num} ${route}`;
  if (route) return route;
  return place.formatted_address?.split(",")[0] ?? "";
}

/**
 * Pull a complete but readable address out of a Place: street + city +
 * province. Used as the default when a user picks a suggestion so the
 * saved record actually identifies the listing (a bare "123 Main St"
 * is ambiguous across cities and was the source of "addresses look
 * incomplete" reports). Postal code and country are omitted — they add
 * noise and the province already disambiguates.
 */
export function fullAddressFromPlace(
  place: google.maps.places.PlaceResult
): string {
  const comps = place.address_components;
  const num = extractComponent(comps, "street_number");
  const route = extractComponent(comps, "route");
  const street = num && route ? `${num} ${route}` : route ?? "";
  // Canadian addresses sometimes use `sublocality_level_1` (borough)
  // instead of `locality` — fall through so Montreal-area listings
  // resolve to their actual city rather than an empty string.
  const city =
    extractComponent(comps, "locality") ??
    extractComponent(comps, "sublocality_level_1") ??
    extractComponent(comps, "administrative_area_level_2") ??
    "";
  // Province/state in short form ("QC" rather than "Quebec") reads
  // better on invoice line items and event cards.
  const region = extractComponentShort(comps, "administrative_area_level_1") ?? "";
  const parts = [street, city, region].filter((p) => p.length > 0);
  if (parts.length > 0) return parts.join(", ");
  // Fallback: trim the ", Canada" tail from formatted_address.
  return (place.formatted_address ?? "").replace(/,\s*[A-Z]{2,3}\s*\d.*$/i, "").replace(/,\s*Canada$/i, "");
}

/**
 * Async access to the Places library — callers should check for a null
 * return (means key missing or load failed) and disable autocomplete UI.
 */
export async function getPlacesLibrary(): Promise<google.maps.PlacesLibrary | null> {
  return getPlaces();
}

/**
 * Driving distance in kilometers from `origin` to `destination`.
 * Uses Distance Matrix with DRIVING mode so we bill on real road
 * distance, not as-the-crow-flies.
 */
export async function computeDrivingDistanceKm(
  origin: string | google.maps.LatLngLiteral,
  destination: string | google.maps.LatLngLiteral
): Promise<number | null> {
  const info = await computeDriveInfo(origin, destination);
  return info?.km ?? null;
}

/**
 * Full drive info — distance in km + duration in seconds — for the
 * same origin/destination pair. Used by the pre-shoot brief to
 * show "18 km · 24 min" at a glance without a second API call.
 */
export async function computeDriveInfo(
  origin: string | google.maps.LatLngLiteral,
  destination: string | google.maps.LatLngLiteral
): Promise<{ km: number; durationSeconds: number } | null> {
  const routes = await getRoutes();
  if (!routes) return null;
  const service = new routes.DistanceMatrixService();
  const response = await service.getDistanceMatrix({
    origins: [origin],
    destinations: [destination],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  });
  const element = response.rows[0]?.elements[0];
  if (!element || element.status !== "OK") return null;
  return {
    km: element.distance.value / 1000,
    durationSeconds: element.duration.value,
  };
}

/**
 * Given a one-way driving distance, the free radius, and the per-km
 * rate, return the billable travel fee. Everything inside the free
 * radius is free; kilometers outside it are billed at the per-km rate.
 *
 *   fee = max(0, distanceKm - freeKm) * ratePerKm
 */
export function computeTravelFee(params: {
  distanceKm: number;
  freeKm: number;
  ratePerKm: number;
}): number {
  const { distanceKm, freeKm, ratePerKm } = params;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  if (distanceKm <= freeKm) return 0;
  const billableKm = distanceKm - freeKm;
  return Math.round(billableKm * ratePerKm * 100) / 100;
}
