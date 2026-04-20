import { DollarSign, Package as PackageIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useSharedData } from "@/contexts/shared-context";
import { formatDollar } from "@/components/shared/format-utils";

export function PricingPage() {
  const { data } = useSharedData();
  const pricing = data?.pricing;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Pricing"
        subtitle="Your current rate sheet"
      />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        {!pricing ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-14 text-center shadow-xs">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground">
              <DollarSign className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-medium">No pricing shared yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your photographer hasn't published pricing for your account.
                It'll show up here automatically once they do.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:gap-8">
            {pricing.discount ? (
              <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <DollarSign className="h-4 w-4" aria-hidden />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {pricing.discount.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Applied to every invoice pre-tax.
                  </div>
                </div>
              </div>
            ) : null}

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <PackageIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Packages
                </h2>
              </div>
              <ul className="flex flex-col divide-y overflow-hidden rounded-xl border bg-card shadow-xs">
                {pricing.packages.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{p.name}</div>
                      {p.extraLabel && p.extraPrice ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          + {formatDollar(p.extraPrice)} per extra{" "}
                          {p.extraLabel.toLowerCase().replace("extra ", "")}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatDollar(p.price)}
                    </div>
                  </li>
                ))}
                {pricing.packages.length === 0 ? (
                  <li className="p-4 text-center text-sm text-muted-foreground">
                    No packages configured.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <PackageIcon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden
                />
                <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Add-ons
                </h2>
              </div>
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pricing.addons.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{a.name}</div>
                      {a.qty ? (
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          Per unit
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatDollar(a.price)}
                    </div>
                  </li>
                ))}
                {pricing.addons.length === 0 ? (
                  <li className="rounded-xl border bg-card p-4 text-center text-sm text-muted-foreground shadow-xs sm:col-span-2">
                    No add-ons configured.
                  </li>
                ) : null}
              </ul>
            </section>

            <p className="text-[11px] text-muted-foreground">
              Taxes (GST 5% + QST 9.975%) added on the invoice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
