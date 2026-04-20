import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Text input. Borrows AlignUI's "ring-on-everything" treatment so
 * inputs read as proper layered surfaces:
 *
 *   - 1px border in the `--input` token for the resting edge
 *   - `ring-1 ring-inset ring-black/[0.04]` for a whisper of inner
 *     depth on light mode (flipped to white/[0.03] in dark)
 *   - Hover bumps the border tone up for affordance
 *   - Focus-visible replaces the inner ring with a 3-pixel ring in
 *     the `--ring` token at 40% opacity — a halo rather than a hard
 *     line, matching the glow treatment used elsewhere.
 *
 * Placeholder drops to 60% muted so the active value always reads
 * as the strongest thing in the field.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 py-1 text-base shadow-[inset_0_1px_0_0_rgb(0_0_0/0.02)] transition-[color,border-color,box-shadow,background-color] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/60 hover:border-foreground/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.03)]",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:shadow-none",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
