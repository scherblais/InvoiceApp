import { useNavigate } from "react-router-dom";
import { ChevronRight, FileText, Calendar, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PlatformsPanelProps {
  invoicesCount: number;
  unpaidCount: number;
  draftCount: number;
  upcomingCount: number;
  todayCount: number;
}

export function PlatformsPanel({
  invoicesCount,
  unpaidCount,
  draftCount,
  upcomingCount,
  todayCount,
}: PlatformsPanelProps) {
  const navigate = useNavigate();

  const rows = [
    {
      icon: FileText,
      label: "Invoicing",
      meta: [
        `${invoicesCount} invoice${invoicesCount === 1 ? "" : "s"}`,
        `${unpaidCount} unpaid`,
        draftCount > 0
          ? `${draftCount} draft${draftCount === 1 ? "" : "s"}`
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      to: "/invoices",
      disabled: false,
    },
    {
      icon: Calendar,
      label: "Calendar",
      meta: `${upcomingCount} upcoming · ${todayCount} today`,
      to: "/calendar",
      disabled: false,
    },
    {
      icon: Users,
      label: "Clients",
      meta: "Contacts & shared calendars",
      to: "/clients",
      disabled: false,
    },
  ];

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-5 pb-5">
        <CardTitle className="text-sm font-medium">Platforms</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => !row.disabled && navigate(row.to)}
                disabled={row.disabled}
                className={cn(
                  "group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors",
                  row.disabled
                    ? "opacity-50"
                    : "hover:bg-muted/40 cursor-pointer"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
                  <row.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {row.label}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {row.meta}
                  </div>
                </div>
                {!row.disabled ? (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
