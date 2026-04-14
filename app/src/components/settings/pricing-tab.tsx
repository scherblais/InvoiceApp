import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DEFAULT_ADDONS, DEFAULT_PACKAGES } from "@/lib/invoice";
import type {
  Config,
  ConfigAddon,
  ConfigPackage,
  ConfigTaxes,
  ConfigTravel,
} from "@/lib/types";

interface PricingTabProps {
  config: Config;
  onSave: (next: Config) => void;
}

const DEFAULT_TRAVEL: ConfigTravel = { freeKm: 25, ratePerKm: 0.65 };
const DEFAULT_TAXES: ConfigTaxes = { gst: 5, qst: 9.975 };

export function PricingTab({ config, onSave }: PricingTabProps) {
  const [packages, setPackages] = useState<ConfigPackage[]>(
    config.packages ?? DEFAULT_PACKAGES
  );
  const [addons, setAddons] = useState<ConfigAddon[]>(
    config.addons ?? DEFAULT_ADDONS
  );
  const [travel, setTravel] = useState<ConfigTravel>(
    config.travel ?? DEFAULT_TRAVEL
  );
  const [taxes, setTaxes] = useState<ConfigTaxes>(
    config.taxes ?? DEFAULT_TAXES
  );

  useEffect(() => {
    setPackages(config.packages ?? DEFAULT_PACKAGES);
    setAddons(config.addons ?? DEFAULT_ADDONS);
    setTravel(config.travel ?? DEFAULT_TRAVEL);
    setTaxes(config.taxes ?? DEFAULT_TAXES);
  }, [config]);

  const updatePackage = (idx: number, patch: Partial<ConfigPackage>) => {
    setPackages((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };
  const addPackage = () => {
    setPackages((prev) => [
      ...prev,
      {
        id: `p_${Date.now()}`,
        name: "New package",
        price: 0,
        extraLabel: "Extra photos",
        extraUnit: "photos",
        extraPrice: 5,
      },
    ]);
  };
  const removePackage = (idx: number) => {
    setPackages((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAddon = (idx: number, patch: Partial<ConfigAddon>) => {
    setAddons((prev) => prev.map((a, i) => (i === idx ? { ...a, ...patch } : a)));
  };
  const addAddon = () => {
    setAddons((prev) => [
      ...prev,
      { id: `a_${Date.now()}`, name: "New add-on", price: 0, qty: false },
    ]);
  };
  const removeAddon = (idx: number) => {
    setAddons((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ ...config, packages, addons, travel, taxes });
    toast.success("Pricing saved");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Packages */}
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Packages</h3>
          <Button variant="outline" size="sm" onClick={addPackage}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add package
          </Button>
        </div>
        {packages.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No packages. Add one to offer it on invoices.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {packages.map((p, idx) => (
              <div
                key={p.id}
                className="grid grid-cols-12 items-end gap-2 rounded-md border bg-background/50 p-3"
              >
                <div className="col-span-12 flex flex-col gap-1 sm:col-span-4">
                  <Label className="text-[11px]">Name</Label>
                  <Input
                    value={p.name}
                    onChange={(e) => updatePackage(idx, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-4 flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-[11px]">Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.price}
                    onChange={(e) =>
                      updatePackage(idx, { price: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-8 flex flex-col gap-1 sm:col-span-3">
                  <Label className="text-[11px]">Extra label</Label>
                  <Input
                    value={p.extraLabel ?? ""}
                    onChange={(e) =>
                      updatePackage(idx, { extraLabel: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-8 flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-[11px]">Extra $</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={p.extraPrice ?? 0}
                    onChange={(e) =>
                      updatePackage(idx, {
                        extraPrice: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="col-span-4 flex justify-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removePackage(idx)}
                    aria-label="Remove package"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add-ons */}
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Add-ons</h3>
          <Button variant="outline" size="sm" onClick={addAddon}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add add-on
          </Button>
        </div>
        {addons.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No add-ons configured.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {addons.map((a, idx) => (
              <div
                key={a.id}
                className="grid grid-cols-12 items-end gap-2 rounded-md border bg-background/50 p-3"
              >
                <div className="col-span-12 flex flex-col gap-1 sm:col-span-6">
                  <Label className="text-[11px]">Name</Label>
                  <Input
                    value={a.name}
                    onChange={(e) => updateAddon(idx, { name: e.target.value })}
                  />
                </div>
                <div className="col-span-5 flex flex-col gap-1 sm:col-span-2">
                  <Label className="text-[11px]">Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={a.price}
                    onChange={(e) =>
                      updateAddon(idx, { price: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="col-span-5 flex items-center gap-2 sm:col-span-3">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={!!a.qty}
                      onChange={(e) =>
                        updateAddon(idx, { qty: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-input"
                    />
                    Quantity-based
                  </label>
                </div>
                <div className="col-span-2 flex justify-end sm:col-span-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => removeAddon(idx)}
                    aria-label="Remove add-on"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Travel */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Travel</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Free kilometers</Label>
            <Input
              type="number"
              value={travel.freeKm}
              onChange={(e) =>
                setTravel((t) => ({ ...t, freeKm: Number(e.target.value) }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Rate per km ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={travel.ratePerKm}
              onChange={(e) =>
                setTravel((t) => ({
                  ...t,
                  ratePerKm: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
      </section>

      {/* Taxes */}
      <section className="rounded-lg border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold">Taxes</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>GST %</Label>
            <Input
              type="number"
              step="0.001"
              value={taxes.gst}
              onChange={(e) =>
                setTaxes((t) => ({ ...t, gst: Number(e.target.value) }))
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>QST %</Label>
            <Input
              type="number"
              step="0.001"
              value={taxes.qst}
              onChange={(e) =>
                setTaxes((t) => ({ ...t, qst: Number(e.target.value) }))
              }
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save pricing</Button>
      </div>
    </div>
  );
}
