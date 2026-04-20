import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * Button variant map, loosely inspired by AlignUI's tonal system.
 *
 *   Solid (default / destructive)     — action buttons, high emphasis
 *   Soft  (soft, soft-destructive,    — secondary actions, low
 *          soft-success, soft-warning,  noise; tinted background,
 *          soft-info)                   matching foreground
 *   Outline                           — quiet alternatives, bordered
 *   Secondary                         — neutral compact
 *   Ghost / Link                      — inline, near-invisible
 *
 * Every solid / soft variant gets a subtle inset ring via
 * `ring-1 ring-inset ring-black/5` (light) and a hover-bloom glow in
 * dark so buttons read as properly lit surfaces rather than flat
 * rectangles.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[background-color,box-shadow,color,border-color,transform] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground ring-1 ring-inset ring-black/5 hover:bg-primary/90 hover:shadow-glow-sm active:scale-[0.98] dark:ring-white/10",
        destructive:
          "bg-destructive text-white ring-1 ring-inset ring-black/10 hover:bg-destructive/90 hover:shadow-glow-sm focus-visible:ring-destructive/30 active:scale-[0.98] dark:bg-destructive/70 dark:ring-white/10 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98] dark:bg-transparent dark:hover:bg-accent/50",
        secondary:
          "bg-secondary text-secondary-foreground ring-1 ring-inset ring-black/5 hover:bg-secondary/80 active:scale-[0.98] dark:ring-white/10",
        soft:
          "bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 hover:bg-primary/15 active:scale-[0.98] dark:bg-primary/15 dark:ring-primary/25 dark:hover:bg-primary/20",
        "soft-destructive":
          "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20 hover:bg-destructive/15 active:scale-[0.98] dark:bg-destructive/15 dark:hover:bg-destructive/20",
        "soft-success":
          "bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/20 hover:bg-emerald-500/15 active:scale-[0.98] dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/25 dark:hover:bg-emerald-500/20",
        "soft-warning":
          "bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 hover:bg-amber-500/15 active:scale-[0.98] dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/25 dark:hover:bg-amber-500/20",
        "soft-info":
          "bg-blue-500/10 text-blue-700 ring-1 ring-inset ring-blue-500/20 hover:bg-blue-500/15 active:scale-[0.98] dark:bg-blue-500/15 dark:text-blue-400 dark:ring-blue-500/25 dark:hover:bg-blue-500/20",
        ghost:
          "hover:bg-accent hover:text-accent-foreground active:scale-[0.98] dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
