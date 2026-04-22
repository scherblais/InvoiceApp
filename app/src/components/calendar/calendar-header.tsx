import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
  title: string;
  count?: number;
  onNew: () => void;
}

export function CalendarHeader({ title, count, onNew }: CalendarHeaderProps) {
  return (
    <header className="app-header flex flex-col justify-center gap-3 border-b bg-background/60 px-6 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-8">
      <div className="flex min-w-0 flex-col">
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {typeof count === "number" ? (
          <span className="text-xs text-muted-foreground">
            {count} {count === 1 ? "shoot" : "shoots"} in the next 30 days
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onNew} className="gap-1.5" aria-label="New event">
          <Plus className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">New</span>
        </Button>
      </div>
    </header>
  );
}
