import { useState } from "react";
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

export function SettingsView() {
  const { config, saveConfig } = useData();
  const [tab, setTab] = useState("pricing");

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" subtitle="Default pricing and account." />
      <div className="flex-1 overflow-y-auto p-6 md:p-10">
        <div className="mx-auto max-w-4xl">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="pricing" className="mt-8">
              <PricingTab config={config} onSave={saveConfig} />
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
