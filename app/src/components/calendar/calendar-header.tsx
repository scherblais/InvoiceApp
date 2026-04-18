import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  KanbanSquare,
  LayoutGrid,
  List,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CalendarViewMode } from "@/components/calendar/types";

interface CalendarHeaderProps {
  view: CalendarViewMode;
  onView: (v: CalendarViewMode) => void;
  title: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onNew: () => void;
  showNav: boolean;
}

// Prev/Next button labels depend on the active view so screen readers
// announce "Previous month" instead of a context-free "Previous".
const NAV_NOUN: Record<CalendarViewMode, string> = {
  month: "month",
  week: "week",
  agenda: "period",
  kanban: "period",
};

export function CalendarHeader({
  view,
  onView,
  title,
  onPrev,
  onNext,
  onToday,
  onNew,
  showNav,
}: CalendarHeaderProps) {
  const noun = NAV_NOUN[view];
  return (
    <header className="app-header flex flex-col justify-center gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {showNav ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              aria-label={`Previous ${noun}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              aria-label={`Next ${noun}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Tabs value={view} onValueChange={(v) => onView(v as CalendarViewMode)}>
          <TabsList>
            <TabsTrigger value="agenda" className="gap-1.5" aria-label="Agenda view">
              <List className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5" aria-label="Week view">
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5" aria-label="Month view">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5" aria-label="Board view">
              <KanbanSquare className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Board</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={onNew} className="gap-1.5" aria-label="New event">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
