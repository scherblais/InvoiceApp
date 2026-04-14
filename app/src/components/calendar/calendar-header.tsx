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
  return (
    <header className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between md:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {showNav ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrev}
              aria-label="Previous"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              aria-label="Next"
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
            <TabsTrigger value="agenda" className="gap-1.5">
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="week" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </TabsTrigger>
            <TabsTrigger value="month" className="gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Month</span>
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-1.5">
              <KanbanSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Board</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
