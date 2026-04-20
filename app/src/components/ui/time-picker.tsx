import * as React from "react";
import { Check, Clock, X } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  /** HH:mm (24h) — matches the format the form state already uses. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** When true, renders a small × button to clear the time. */
  clearable?: boolean;
  /** Start of the suggested range, in minutes from midnight. Default 6:00. */
  fromMinutes?: number;
  /** End of the suggested range, inclusive. Default 21:30. */
  toMinutes?: number;
  /** Step between suggestions, in minutes. Default 30. */
  stepMinutes?: number;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function toHHmm(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad(h)}:${pad(m)}`;
}

/** "08:30" → "8:30 AM". Accepts a partial / invalid value by returning
 *  the input unchanged so the command input still shows what the user
 *  typed while they're editing. */
function formatDisplay(hhmm: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!match) return hhmm;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) {
    return hhmm;
  }
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${pad(m)} ${period}`;
}

/** Accept "8", "8:30", "830", "8 PM", "8:30pm" and normalize to HH:mm. */
function parseLoose(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  const m = /^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const ampm = m[3];
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return null;
  if (ampm) {
    if (h < 1 || h > 12) return null;
    if (ampm === "pm" && h !== 12) h += 12;
    if (ampm === "am" && h === 12) h = 0;
  } else {
    if (h > 23) return null;
  }
  return `${pad(h)}:${pad(min)}`;
}

/**
 * Time picker with a popover of common slots and loose parsing.
 *
 * Trigger shows the selected time in 12-hour form ("1:00 PM"); the
 * popover hosts a searchable list of 30-minute slots from 6:00 AM
 * to 9:30 PM plus a text field that accepts freeform entries like
 * "8", "8:30", "8:30pm" — parseLoose normalizes all of those to
 * HH:mm so the stored value keeps the same shape the form state
 * already expects.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Pick a time",
  clearable = false,
  fromMinutes = 6 * 60,
  toMinutes = 21 * 60 + 30,
  stepMinutes = 30,
  id,
  className,
  ariaLabel,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const slots = React.useMemo(() => {
    const out: string[] = [];
    for (let t = fromMinutes; t <= toMinutes; t += stepMinutes) {
      out.push(toHHmm(t));
    }
    return out;
  }, [fromMinutes, toMinutes, stepMinutes]);

  const display = value ? formatDisplay(value) : placeholder;

  const handleSelect = (hhmm: string) => {
    onChange(hhmm);
    setOpen(false);
    setQuery("");
  };

  // Allow the text field to commit freeform entries on Enter or when
  // the user picks the "Use X" synthetic row the list shows when the
  // query parses to a valid time not in the slot list.
  const parsedQuery = parseLoose(query);
  const hasExactSlot = parsedQuery ? slots.includes(parsedQuery) : false;

  return (
    <div className={cn("relative", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
              "w-full justify-start text-left font-normal tabular-nums",
              clearable && value && "pr-8",
              !value && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 size-4 shrink-0 opacity-70" />
            {display}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command shouldFilter={true}>
            <CommandInput
              placeholder="Type or pick…"
              value={query}
              onValueChange={setQuery}
              onKeyDown={(e) => {
                if (e.key === "Enter" && parsedQuery && !hasExactSlot) {
                  e.preventDefault();
                  handleSelect(parsedQuery);
                }
              }}
            />
            <CommandList className="max-h-64">
              <CommandEmpty>
                {parsedQuery ? (
                  <button
                    type="button"
                    onClick={() => handleSelect(parsedQuery)}
                    className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent rounded-sm"
                  >
                    Use <span className="font-medium">{formatDisplay(parsedQuery)}</span>
                  </button>
                ) : (
                  "No match. Try '8:30' or '2 pm'."
                )}
              </CommandEmpty>
              {parsedQuery && !hasExactSlot ? (
                <CommandGroup>
                  <CommandItem
                    value={`__custom_${parsedQuery}`}
                    onSelect={() => handleSelect(parsedQuery)}
                  >
                    <span className="font-medium">
                      Use {formatDisplay(parsedQuery)}
                    </span>
                  </CommandItem>
                </CommandGroup>
              ) : null}
              <CommandGroup>
                {slots.map((slot) => (
                  <CommandItem
                    key={slot}
                    value={`${slot} ${formatDisplay(slot)}`}
                    onSelect={() => handleSelect(slot)}
                    className="tabular-nums"
                  >
                    <span className="flex-1">{formatDisplay(slot)}</span>
                    {value === slot ? <Check className="size-4" /> : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && value ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
          aria-label="Clear time"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
