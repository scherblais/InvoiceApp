import { useRef, useState } from "react";
import {
  Car,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  RotateCw,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";
import {
  computeItemTotals,
  type Addon,
  type InvoiceItem,
  type Package,
} from "@/lib/invoice";
import {
  DEFAULT_TRAVEL_ORIGIN,
  computeDrivingDistanceKm,
  computeTravelFee,
  hasMapsApiKey,
  type PickedPlace,
} from "@/lib/maps";
import { formatCurrency } from "@/lib/format";
import type { ConfigTravel } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  item: InvoiceItem;
  index: number;
  packages: Package[];
  addons: Addon[];
  travel?: ConfigTravel;
  /** Controlled expanded state. Parent owns which listings are
   *  open so add / remove stays in sync with the items array. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (item: InvoiceItem) => void;
  onRemove: () => void;
}

export function ListingCard({
  item,
  index,
  packages,
  addons,
  travel,
  open,
  onOpenChange,
  onChange,
  onRemove,
}: ListingCardProps) {
  const totals = computeItemTotals(item);
  const [calcState, setCalcState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "error"; message: string }
  >({ status: "idle" });
  // Mirror the latest item into a ref so async travel-fee callbacks use
  // the current item (with the address / package the user just typed)
  // rather than the stale snapshot from when the request began.
  const itemRef = useRef(item);
  itemRef.current = item;

  const setField = <K extends keyof InvoiceItem>(
    key: K,
    value: InvoiceItem[K]
  ) => {
    onChange({ ...item, [key]: value });
  };

  const setPackage = (id: string) => {
    const pkg = packages.find((p) => p.id === id);
    if (pkg) onChange({ ...item, pkg });
  };

  const toggleAddon = (addonId: string) => {
    const baseAddon = addons.find((a) => a.id === addonId);
    if (!baseAddon) return;
    const existing = (item.addons ?? []).find((a) => a.id === addonId);
    if (existing) {
      onChange({
        ...item,
        addons: (item.addons ?? []).filter((a) => a.id !== addonId),
      });
    } else {
      onChange({
        ...item,
        addons: [
          ...(item.addons ?? []),
          {
            ...baseAddon,
            count: 1,
            totalPrice: baseAddon.price,
          },
        ],
      });
    }
  };

  const setAddonCount = (addonId: string, count: number) => {
    const nextAddons = (item.addons ?? []).map((a) =>
      a.id === addonId
        ? { ...a, count, totalPrice: Math.round(a.price * count * 100) / 100 }
        : a
    );
    onChange({ ...item, addons: nextAddons });
  };

  const currentAddonIds = new Set((item.addons ?? []).map((a) => a.id));
  const mapsEnabled = hasMapsApiKey();
  const freeKm = travel?.freeKm ?? 25;
  const ratePerKm = travel?.ratePerKm ?? 0.65;
  const origin = travel?.origin || DEFAULT_TRAVEL_ORIGIN;

  /**
   * Compute the travel fee for a given destination (either a LatLng from
   * a picked place, or a raw address string as a fallback). We cache the
   * distance + fee on the item so re-renders don't re-hit the API.
   */
  const calcTravelFor = async (
    destination: google.maps.LatLngLiteral | string
  ) => {
    if (!mapsEnabled) return;
    setCalcState({ status: "loading" });
    try {
      const km = await computeDrivingDistanceKm(origin, destination);
      if (km == null) {
        setCalcState({
          status: "error",
          message: "Couldn't reach Google Maps — enter travel manually.",
        });
        return;
      }
      const distance = Math.round(km * 10) / 10;
      const fee = computeTravelFee({
        distanceKm: distance,
        freeKm,
        ratePerKm,
      });
      onChange({
        ...itemRef.current,
        travel: { distance, fee, calculated: true },
      });
      setCalcState({ status: "idle" });
    } catch (err) {
      setCalcState({
        status: "error",
        message: err instanceof Error ? err.message : "Distance lookup failed.",
      });
    }
  };

  const handlePlacePicked = (picked: PickedPlace) => {
    void calcTravelFor(picked.location);
  };

  const handleRecalculate = () => {
    if (!item.address?.trim()) return;
    void calcTravelFor(item.address);
  };

  const handleClearTravel = () => {
    onChange({ ...item, travel: undefined });
    setCalcState({ status: "idle" });
  };

  const travelInfo = item.travel;
  const billableKm =
    travelInfo && travelInfo.distance > freeKm
      ? Math.round((travelInfo.distance - freeKm) * 10) / 10
      : 0;

  const summaryAddress = item.unit
    ? `${item.address}, Apt ${item.unit}`
    : item.address || `Listing ${index + 1}`;
  const summaryPackage = item.pkg?.name ?? "No package";
  const addonCount = item.addons?.length ?? 0;

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className={cn(
        "rounded-lg border bg-card transition-shadow",
        open && "shadow-sm"
      )}
    >
      {/* Summary row — always visible. Collapsed, it acts as the only
          row; expanded, it's the header above the full form. */}
      <div className="flex items-center gap-2 px-4 py-3">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-label={open ? "Collapse listing" : "Expand listing"}
          >
            <ChevronDown
              className={cn(
                "size-4 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
              aria-hidden
            />
            <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Listing {index + 1}
            </span>
            <span className="mx-1 shrink-0 text-muted-foreground/40">·</span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {summaryAddress}
            </span>
            <span className="hidden shrink-0 text-xs text-muted-foreground md:inline">
              {summaryPackage}
              {addonCount > 0
                ? ` · ${addonCount} add-on${addonCount === 1 ? "" : "s"}`
                : ""}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums">
              {formatCurrency(totals.subtotal ?? 0, 2)}
            </span>
          </button>
        </CollapsibleTrigger>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove listing ${index + 1}`}
          className="size-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </div>

      <CollapsibleContent>
        <div className="space-y-5 border-t px-4 pb-4 pt-4">

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`addr-${index}`}>Address</Label>
          <AddressAutocomplete
            id={`addr-${index}`}
            value={item.address ?? ""}
            onChange={(v) => setField("address", v)}
            onPlacePicked={handlePlacePicked}
            placeholder="123 Main St"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`unit-${index}`}>Unit</Label>
          <Input
            id={`unit-${index}`}
            value={item.unit ?? ""}
            onChange={(e) => setField("unit", e.target.value)}
            placeholder="—"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Package</Label>
        {/* Radio cards instead of a Select dropdown — with only a
            couple packages in the system, a visible grid lets the
            user scan name + price at a glance and pick in one
            click. The whole row is the label, so click anywhere to
            select. */}
        <RadioGroup
          value={item.pkg?.id ?? ""}
          onValueChange={setPackage}
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {packages.map((p) => {
            const active = item.pkg?.id === p.id;
            return (
              <Label
                key={p.id}
                htmlFor={`pkg-${index}-${p.id}`}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
                  active
                    ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                )}
              >
                <RadioGroupItem
                  id={`pkg-${index}-${p.id}`}
                  value={p.id}
                  className="mt-0.5"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium leading-none">
                    {p.name}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatCurrency(p.price, 0)}
                    {p.extraLabel ? (
                      <>
                        {" "}
                        · {formatCurrency(p.extraPrice ?? 0, 0)}/
                        {p.extraLabel.toLowerCase()}
                      </>
                    ) : null}
                  </span>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        {item.pkg?.extraLabel ? (
          <div className="mt-1 flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <Label
                htmlFor={`extras-${index}`}
                className="text-sm font-medium"
              >
                {item.pkg.extraLabel}
              </Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatCurrency(item.pkg.extraPrice ?? 0, 0)} each
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() =>
                  setField(
                    "extrasQty",
                    Math.max(0, (item.extrasQty ?? 0) - 1)
                  )
                }
                disabled={(item.extrasQty ?? 0) <= 0}
                aria-label={`Decrease ${item.pkg.extraLabel.toLowerCase()}`}
              >
                <Minus className="h-3.5 w-3.5" aria-hidden />
              </Button>
              <Input
                id={`extras-${index}`}
                type="number"
                min="0"
                value={item.extrasQty ?? 0}
                onChange={(e) =>
                  setField(
                    "extrasQty",
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="h-7 w-14 text-center"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-7"
                onClick={() =>
                  setField("extrasQty", (item.extrasQty ?? 0) + 1)
                }
                aria-label={`Increase ${item.pkg.extraLabel.toLowerCase()}`}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Add-ons</Label>
        <div className="flex flex-col gap-1.5">
          {addons.map((a) => {
            const active = currentAddonIds.has(a.id);
            const current = (item.addons ?? []).find((x) => x.id === a.id);
            const count = current?.count ?? 1;
            const rowId = `addon-${index}-${a.id}`;
            return (
              <Label
                key={a.id}
                htmlFor={rowId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                  active
                    ? "border-primary/50 bg-primary/5"
                    : "hover:bg-muted/40"
                )}
              >
                <Checkbox
                  id={rowId}
                  checked={active}
                  onCheckedChange={() => toggleAddon(a.id)}
                />
                <span className="flex-1 text-sm font-medium">{a.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(a.price, 0)}
                  {a.qty ? " each" : ""}
                </span>
                {active && a.qty ? (
                  <div
                    // Prevent the label click from re-toggling the row
                    // when the user is interacting with the counter.
                    onClick={(e) => e.preventDefault()}
                    className="flex items-center gap-1"
                  >
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-6"
                      onClick={() =>
                        setAddonCount(a.id, Math.max(1, count - 1))
                      }
                      disabled={count <= 1}
                      aria-label={`Decrease ${a.name}`}
                    >
                      <Minus className="h-3 w-3" aria-hidden />
                    </Button>
                    <span className="w-6 text-center text-xs font-medium tabular-nums">
                      {count}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-6"
                      onClick={() => setAddonCount(a.id, count + 1)}
                      aria-label={`Increase ${a.name}`}
                    >
                      <Plus className="h-3 w-3" aria-hidden />
                    </Button>
                  </div>
                ) : null}
              </Label>
            );
          })}
        </div>
      </div>

      {/* Travel — no outer bordered box; the section label + spacing
          is enough visual separation now that the card's other
          sections dropped their bordered wrappers too. */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Car
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <div className="flex flex-col gap-0.5">
              <div className="text-sm font-medium">Travel</div>
              {travelInfo ? (
                travelInfo.fee > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {travelInfo.distance.toFixed(1)} km
                    {billableKm > 0 ? (
                      <>
                        {" "}
                        · {billableKm.toFixed(1)} km billable × {formatCurrency(
                          ratePerKm,
                          2
                        )}
                      </>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {travelInfo.distance.toFixed(1)} km · within {freeKm} km
                    free radius
                  </div>
                )
              ) : (
                <div className="text-xs text-muted-foreground">
                  {mapsEnabled
                    ? "Pick an address to auto-calculate."
                    : `$${ratePerKm.toFixed(2)}/km beyond ${freeKm} km. Enter manually.`}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold tabular-nums">
              {formatCurrency(travelInfo?.fee ?? 0, 2)}
            </div>
            {mapsEnabled && item.address?.trim() ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleRecalculate}
                disabled={calcState.status === "loading"}
                aria-label="Recalculate travel distance"
                className="h-7 w-7"
              >
                {calcState.status === "loading" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <RotateCw className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        </div>
        {/* Manual override row — shown when no key or when user wants to
            override the computed value. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={`travel-dist-${index}`}
              className="text-[11px] text-muted-foreground"
            >
              Distance (km)
            </Label>
            <Input
              id={`travel-dist-${index}`}
              type="number"
              min="0"
              step="0.1"
              value={travelInfo?.distance ?? ""}
              onChange={(e) => {
                const distance = Math.max(0, Number(e.target.value) || 0);
                const fee = computeTravelFee({
                  distanceKm: distance,
                  freeKm,
                  ratePerKm,
                });
                onChange({
                  ...item,
                  travel: { distance, fee, calculated: false },
                });
              }}
              placeholder="0.0"
              className="h-8"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label
              htmlFor={`travel-fee-${index}`}
              className="text-[11px] text-muted-foreground"
            >
              Fee ($)
            </Label>
            <Input
              id={`travel-fee-${index}`}
              type="number"
              min="0"
              step="0.01"
              value={travelInfo?.fee ?? ""}
              onChange={(e) => {
                const fee = Math.max(0, Number(e.target.value) || 0);
                onChange({
                  ...item,
                  travel: {
                    distance: travelInfo?.distance ?? 0,
                    fee,
                    calculated: false,
                  },
                });
              }}
              placeholder="0.00"
              className="h-8"
            />
          </div>
        </div>
        {calcState.status === "error" ? (
          <p className="mt-2 text-xs text-destructive">{calcState.message}</p>
        ) : null}
        {travelInfo && !travelInfo.calculated && mapsEnabled ? (
          <button
            type="button"
            onClick={handleClearTravel}
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Clear manual entry
          </button>
        ) : null}
      </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
