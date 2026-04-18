import { DollarSign, TrendingUp, Clock, Receipt } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { computeDashboardStats } from "@/lib/stats";
import { formatCurrency, formatLongDate, getGreeting, todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import { PlatformsPanel } from "@/components/dashboard/platforms-panel";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { Weather } from "@/components/dashboard/weather";

export function DashboardView() {
  const { invoices, drafts, clients, calEvents } = useData();
  const stats = computeDashboardStats(invoices, drafts);
  const iso = todayISO();
  const upcomingCount = calEvents.filter((e) => e.date >= iso).length;
  const todayCount = calEvents.filter((e) => e.date === iso).length;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={getGreeting()}
        subtitle={formatLongDate()}
        actions={<Weather />}
      />

      <div className="flex flex-col gap-8 p-6 md:gap-10 md:p-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
          <StatCard
            label="This Month"
            value={formatCurrency(stats.monthRevenue)}
            icon={DollarSign}
            trend={{
              text: stats.revBadgeText,
              kind: stats.revBadgeKind,
            }}
          />
          <StatCard
            label="YTD Revenue"
            value={formatCurrency(stats.ytdRevenue)}
            icon={TrendingUp}
          />
          <StatCard
            label="Unpaid"
            value={formatCurrency(stats.pendingAmount)}
            icon={Clock}
            warn={stats.pendingAmount > 0}
            subValue={
              stats.pendingCount > 0
                ? `${stats.pendingCount} invoice${
                    stats.pendingCount === 1 ? "" : "s"
                  }`
                : undefined
            }
          />
          <StatCard
            label="Taxes Owed"
            value={formatCurrency(stats.monthTax)}
            icon={Receipt}
            subValue={`YTD ${formatCurrency(stats.ytdTax)}`}
          />
        </div>

        <RevenueChart invoices={invoices} drafts={drafts} />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
          <AttentionPanel
            invoices={invoices}
            drafts={drafts}
            clients={clients}
          />
          <UpcomingPanel calEvents={calEvents} />
          <PlatformsPanel
            invoicesCount={invoices.length}
            unpaidCount={stats.pendingCount}
            draftCount={stats.draftCount}
            upcomingCount={upcomingCount}
            todayCount={todayCount}
          />
        </div>
      </div>
    </div>
  );
}
