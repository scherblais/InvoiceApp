import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  /** Optional meta / subtitle rendered below the title. */
  subtitle?: ReactNode;
  /** Optional lead element (e.g. a back button) placed before the title block. */
  lead?: ReactNode;
  /** Right-aligned actions on desktop. Stacks below on mobile. */
  actions?: ReactNode;
  /** Additional classes appended to the outer <header>. */
  className?: string;
}

/**
 * Single source of truth for the top bar on every signed-in view.
 * Maintains the shared `.app-header` height so the sidebar's bottom
 * border lines up with every route's header stroke, and keeps the
 * title / subtitle / actions alignment identical across pages.
 */
export function PageHeader({
  title,
  subtitle,
  lead,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "app-header flex flex-col justify-center gap-3 border-b bg-background/60 px-6 py-4 backdrop-blur-sm md:flex-row md:items-center md:justify-between md:px-10",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {lead ? <div className="shrink-0">{lead}</div> : null}
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold tracking-tight text-foreground md:text-[22px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
