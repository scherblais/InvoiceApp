import { DollarSign, TrendingUp, Clock, Receipt } from "lucide-react";
import { useData } from "@/contexts/data-context";
import { computeDashboardStats } from "@/lib/stats";
import { formatCurrency, formatLongDate, getGreeting } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttentionPanel } from "@/components/dashboard/attention-panel";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import { ToSchedulePanel } from "@/components/dashboard/to-schedule-panel";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { TodaySection } from "@/components/dashboard/today-section";
import { Weather } from "@/components/dashboard/weather";

/**
 * Dashboard layout:
 *
 *   Today   — the hero. Answers "what am I shooting today?" first.
 *   Stats   — four money-at-a-glance cards, compact.
 *   Revenue — twelve-month trend anchoring the page's midline.
 *   Panels  — Attention (urgent), Upcoming (next 7 days), Activity
 *             (recent admin). Three columns because each tells a
 *             different story and they shouldn't compete.
 *
 * The old Platforms panel was sidebar navigation dressed up as a
 * dashboard card. Dropped it — the sidebar does that job.
 */
export function DashboardView() {
  const { invoices, drafts, clients, calEvents } = useData();
  const stats = computeDashboardStats(invoices, drafts);

  return (
    <div className="flex flex-col">
      <PageHeader title={getGreeting()} subtitle={formatLongDate()} />

      <div className="flex flex-col gap-8 p-6 md:gap-10 md:p-10">
        <Weather />
        <TodaySection />

        <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-3">
          <ToSchedulePanel />
          <UpcomingPanel calEvents={calEvents} />
          <AttentionPanel
            invoices={invoices}
            drafts={drafts}
            clients={clients}
          />
        </div>

        {/* Money / admin section — lives at the bottom so the top of
            the dashboard stays focused on scheduling and action items. */}
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
      </div>
    </div>
  );
}
