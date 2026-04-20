import * as React from "react";
import { format, parse, isValid } from "date-fns";
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

/**
 * Calendar-popover date picker. Replaces the browser-native
 * `<input type="date">` with a styled Button trigger + a Popover
 * hosting react-day-picker. Round-trips through YYYY-MM-DD strings
 * so it's a drop-in replacement for the existing form state shape.
 *
 * The trigger renders the current value formatted as "Mon, Apr 20,
 * 2026" so the selected day reads as a proper label instead of a
 * raw ISO string. An optional × button clears the date without
 * opening the popover.
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

  const parsed = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const label = parsed ? format(parsed, "EEE, MMM d, yyyy") : placeholder;

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-start text-left font-normal",
              clearable && value && "pr-8",
              !parsed && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => {
              if (d) {
                onChange(format(d, "yyyy-MM-dd"));
                setOpen(false);
              }
            }}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Clear date"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
