import { useState } from "react";
import { useData } from "@/contexts/data-context";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { PricingTab } from "@/components/settings/pricing-tab";
import { ClientsTab } from "@/components/settings/clients-tab";
import { AccountTab } from "@/components/settings/account-tab";

export function SettingsView() {
  const { config, saveConfig, clients, saveClients } = useData();
  const [tab, setTab] = useState("pricing");

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-4 md:px-8">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-xs text-muted-foreground">
          Manage pricing, clients, and your account.
        </p>
      </header>
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="mx-auto max-w-4xl">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="account">Account</TabsTrigger>
            </TabsList>
            <TabsContent value="pricing" className="mt-6">
              <PricingTab config={config} onSave={saveConfig} />
            </TabsContent>
            <TabsContent value="clients" className="mt-6">
              <ClientsTab
                clients={clients}
                config={config}
                onSave={saveClients}
              />
            </TabsContent>
            <TabsContent value="account" className="mt-6">
              <AccountTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
