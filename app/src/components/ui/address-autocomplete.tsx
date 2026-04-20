import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  fullAddressFromPlace,
  getPlacesLibrary,
  hasMapsApiKey,
  shortAddressFromPlace,
  type PickedPlace,
} from "@/lib/maps";
import { cn } from "@/lib/utils";

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  onPlacePicked?: (picked: PickedPlace) => void;
  placeholder?: string;
  /** Restrict autocomplete to these ISO-3166-1 alpha-2 country codes. */
  countries?: string[];
  className?: string;
  autoFocus?: boolean;
  /** Label for screen readers when there's no visible label. */
  ariaLabel?: string;
}

/**
 * Address input with Google Places autocomplete. Gracefully degrades to a
 * plain input when no Maps API key is configured — users just type the
 * address by hand and travel fees stay manual. Placing a pin icon next to
 * the input signals that autocomplete is active.
 */
export function AddressAutocomplete({
  id,
  value,
  onChange,
  onPlacePicked,
  placeholder,
  countries = ["ca"],
  className,
  autoFocus,
  ariaLabel,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  // Track the listener so we can clean up on unmount / deps change.
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  // The Autocomplete instance holds its own reference to the input — we
  // just need to keep it alive and let the effect clean up.
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  // Mirror the latest callbacks into refs so the place_changed listener
  // (which is registered once per effect run) always calls the CURRENT
  // onChange / onPlacePicked instead of a stale closure from the first
  // render. Without this, selecting a place after editing other listing
  // fields would clobber those edits.
  const onChangeRef = useRef(onChange);
  const onPlacePickedRef = useRef(onPlacePicked);
  onChangeRef.current = onChange;
  onPlacePickedRef.current = onPlacePicked;

  const enabled = hasMapsApiKey();
  const countryKey = countries.join(",");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    getPlacesLibrary().then((places) => {
      if (cancelled || !places || !inputRef.current) return;
      const ac = new places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: countries },
        fields: [
          "formatted_address",
          "address_components",
          "geometry",
          "place_id",
        ],
      });
      acRef.current = ac;

      listenerRef.current = ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry?.location) return;
        // Push the FULL "street, city, province" form into the input
        // so the saved record carries enough to identify the listing.
        // The short form is still passed through `onPlacePicked` for
        // consumers that want the compact variant (e.g. chip labels).
        const full = fullAddressFromPlace(place);
        const short = shortAddressFromPlace(place);
        onChangeRef.current(full);
        onPlacePickedRef.current?.({
          formatted: place.formatted_address ?? full,
          shortAddress: short,
          city: place.address_components?.find((c) =>
            c.types.includes("locality")
          )?.long_name,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
          placeId: place.place_id ?? "",
        });
      });
    });

    return () => {
      cancelled = true;
      if (listenerRef.current) {
        listenerRef.current.remove();
        listenerRef.current = null;
      }
      acRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, countryKey]);

  return (
    <div className={cn("relative", className)}>
      {enabled ? (
        <MapPin
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      ) : null}
      <Input
        id={id}
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-label={ariaLabel}
        className={cn(enabled && "pl-8")}
      />
    </div>
  );
}
