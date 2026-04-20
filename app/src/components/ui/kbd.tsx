import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Keyboard shortcut chip. Use inside text (`Press <Kbd>⌘</Kbd><Kbd>K</Kbd>
 * to search`) or as-is for menu accelerators. Styled like a tiny
 * physical key — inset ring on top, thicker shadow on the bottom so
 * it reads as pressable. Monochrome so it pairs with any tone.
 */
export function Kbd({
  className,
  children,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-border bg-background px-1 font-mono text-[10.5px] font-medium text-muted-foreground shadow-[inset_0_-1px_0_0] shadow-border/60 tabular-nums",
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

/**
 * Convenience: renders a sequence like ⌘K as two Kbd chips with
 * a tight gap, so callers can just pass "⌘K" or "⇧⌘P" without
 * splitting the string themselves.
 */
export function KbdSequence({
  keys,
  className,
}: {
  keys: string;
  className?: string;
}) {
  const chars = Array.from(keys);
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)}>
      {chars.map((c, i) => (
        <Kbd key={i}>{c}</Kbd>
      ))}
    </span>
  );
}
