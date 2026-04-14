import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_ADDONS,
  DEFAULT_PACKAGES,
  computeItemTotals,
  type InvoiceItem,
} from "@/lib/invoice";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  item: InvoiceItem;
  index: number;
  onChange: (item: InvoiceItem) => void;
  onRemove: () => void;
}

export function ListingCard({
  item,
  index,
  onChange,
  onRemove,
}: ListingCardProps) {
  const totals = computeItemTotals(item);

  const setField = <K extends keyof InvoiceItem>(
    key: K,
    value: InvoiceItem[K]
  ) => {
    onChange({ ...item, [key]: value });
  };

  const setPackage = (id: string) => {
    const pkg = DEFAULT_PACKAGES.find((p) => p.id === id);
    if (pkg) onChange({ ...item, pkg });
  };

  const toggleAddon = (addonId: string) => {
    const baseAddon = DEFAULT_ADDONS.find((a) => a.id === addonId);
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
    const addons = (item.addons ?? []).map((a) =>
      a.id === addonId
        ? { ...a, count, totalPrice: Math.round(a.price * count * 100) / 100 }
        : a
    );
    onChange({ ...item, addons });
  };

  const currentAddonIds = new Set((item.addons ?? []).map((a) => a.id));

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Listing {index + 1}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`addr-${index}`}>Address</Label>
          <Input
            id={`addr-${index}`}
            value={item.address ?? ""}
            onChange={(e) => setField("address", e.target.value)}
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

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
        <div className="flex flex-col gap-1.5">
          <Label>Package</Label>
          <Select value={item.pkg?.id ?? ""} onValueChange={setPackage}>
            <SelectTrigger>
              <SelectValue placeholder="Choose package" />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PACKAGES.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} · {formatCurrency(p.price, 0)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`extras-${index}`}>
            {item.pkg?.extraLabel ?? "Extras"}
          </Label>
          <Input
            id={`extras-${index}`}
            type="number"
            min="0"
            value={item.extrasQty ?? 0}
            onChange={(e) =>
              setField("extrasQty", Math.max(0, parseInt(e.target.value) || 0))
            }
          />
        </div>
      </div>

      <div className="mt-4">
        <Label className="mb-2 block">Add-ons</Label>
        <div className="flex flex-col gap-1">
          {DEFAULT_ADDONS.map((a) => {
            const active = currentAddonIds.has(a.id);
            const current = (item.addons ?? []).find((x) => x.id === a.id);
            return (
              <div
                key={a.id}
                className={cn(
                  "flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors",
                  active ? "border-primary/40 bg-primary/5" : "border-transparent"
                )}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleAddon(a.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="flex-1">{a.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(a.price, 0)}
                </span>
                {active && a.qty ? (
                  <Input
                    type="number"
                    min="1"
                    value={current?.count ?? 1}
                    onChange={(e) =>
                      setAddonCount(a.id, Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="h-7 w-16"
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 border-t pt-3 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">
            {formatCurrency(totals.subtotal ?? 0, 2)}
          </span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Taxes</span>
          <span className="tabular-nums">
            {formatCurrency((totals.gst ?? 0) + (totals.qst ?? 0), 2)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between font-semibold">
          <span>Total</span>
          <span className="tabular-nums">
            {formatCurrency(totals.total ?? 0, 2)}
          </span>
        </div>
      </div>
    </div>
  );
}
