import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useData } from "@/contexts/data-context";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { PricingTab } from "@/components/settings/pricing-tab";
import { AccountTab } from "@/components/settings/account-tab";
import { TaxReportTab } from "@/components/settings/tax-report-tab";

const VALID_TABS = ["pricing", "taxes", "account"] as const;

export function SettingsView() {
  const { config, saveConfig } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state mirrors ?tab= in the URL so the sidebar sub-links can
  // jump straight to "Account" / "Tax report" and the active
  // highlight follows.
  const [tab, setTabState] = useState<string>(() => {
    const p = searchParams.get("tab");
    return p && (VALID_TABS as readonly string[]).includes(p) ? p : "pricing";
  });

  useEffect(() => {
    const p = searchParams.get("tab");
    if (p && (VALID_TABS as readonly string[]).includes(p) && p !== tab) {
      setTabState(p);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setTab = (next: string) => {
    setTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" subtitle="Default pricing and account." />
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="taxes">Tax report</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="pricing" className="mt-8">
              <PricingTab config={config} onSave={saveConfig} />
            </TabsContent>
            <TabsContent value="taxes" className="mt-8">
              <TaxReportTab />
            </TabsContent>
            <TabsContent value="account" className="mt-8">
              <AccountTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
