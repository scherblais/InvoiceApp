import { useTheme } from "@/contexts/theme-context";
import { useData } from "@/contexts/data-context";
import {
  COLOR_CHIP_DARK,
  COLOR_CHIP_LIGHT,
  eventColor,
  type EventColor,
} from "@/lib/calendar";
import type { CalEvent } from "@/lib/types";
import { formatTime12 } from "@/lib/format";
import { cn } from "@/lib/utils";

interface EventChipProps {
  event: CalEvent;
  onClick: () => void;
  compact?: boolean;
}

export function EventChip({ event, onClick, compact }: EventChipProps) {
  const { theme } = useTheme();
  const { clientsById } = useData();
  const color: EventColor = eventColor(event, clientsById);
  const chip = theme === "dark" ? COLOR_CHIP_DARK[color] : COLOR_CHIP_LIGHT[color];
  const label = event.title || event.address || "Untitled";
  const time = formatTime12(event.start);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{ backgroundColor: chip.bg, color: chip.fg }}
      className={cn(
        // AlignUI-style pastel tile — slightly more rounded, a touch
        // taller, and hover dips opacity instead of color so the
        // tonal feel survives.
        "w-full truncate rounded-md px-1.5 text-left text-[11px] font-medium leading-tight transition-opacity hover:opacity-85",
        compact ? "py-1" : "py-1.5"
      )}
      title={time ? `${time} · ${label}` : label}
    >
      {time ? <span className="tabular-nums mr-1">{time}</span> : null}
      {label}
    </button>
  );
}
