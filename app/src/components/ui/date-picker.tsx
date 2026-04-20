import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** Value in YYYY-MM-DD form. Empty string / undefined = "no date". */
  value: string;
  onChange: (next: string) => void;
  /** Text shown in the trigger when `value` is empty. */
  placeholder?: string;
  /** When true, renders a small × button to clear the date. */
  clearable?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

/** Parse a YYYY-MM-DD string into a Date at local noon. Using noon
 *  keeps DST transitions from rolling the date to the previous /
 *  next day when the timezone shifts. Returns undefined for any
 *  input that doesn't match the shape. */
function parseIsoDate(s: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) {
    return undefined;
  }
  const date = new Date(y, mo - 1, d, 12, 0, 0);
  if (isNaN(date.getTime())) return undefined;
  return date;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/**
 * Calendar-popover date picker. Outline-button trigger + a Popover
 * hosting react-day-picker. Round-trips through YYYY-MM-DD strings
 * so it's a drop-in replacement for the native <input type="date">
 * without changing the form's state shape.
 *
 * Trigger renders the date as "Mon, Apr 20, 2026" when selected;
 * optional × inside the trigger clears the value without opening
 * the popover.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  clearable = false,
  id,
  className,
  ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => parseIsoDate(value), [value]);

  const label = selected ? format(selected, "EEE, MMM d, yyyy") : placeholder;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            data-empty={!selected}
            className={cn(
              "w-full justify-start text-left font-normal",
              "data-[empty=true]:text-muted-foreground",
              clearable && value && "pr-8"
            )}
          >
            <CalendarIcon className="size-4 opacity-70" />
            <span>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(d) => {
              if (d) {
                onChange(toIso(d));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
