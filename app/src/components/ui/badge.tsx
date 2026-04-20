import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Tonal badge system inspired by AlignUI. Every semantic category
 * comes in three "intensities":
 *
 *   default  — solid fill, high-emphasis (e.g., primary CTA chips)
 *   soft     — tinted background + matching text, medium emphasis
 *              (the workhorse for statuses, counts, labels)
 *   outline  — bordered only, low emphasis
 *
 * Use semantic soft variants (success / warning / info / danger)
 * for status-bearing counts; neutral secondary for plain counts.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow,background-color] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline:
          "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",

        // --- Soft tonal variants ------------------------------------
        soft: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 [a&]:hover:bg-primary/15",
        "soft-success":
          "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/25",
        "soft-warning":
          "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400 dark:ring-amber-500/25",
        "soft-danger":
          "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
        "soft-info":
          "bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400 dark:ring-blue-500/25",
        "soft-muted":
          "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
