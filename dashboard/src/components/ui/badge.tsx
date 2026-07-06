import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:ring-destructive/30 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Neutral status chip.
        default:
          "border-border bg-surface-elevated text-foreground [a&]:hover:bg-surface",
        secondary:
          "border-border bg-surface text-muted-foreground [a&]:hover:text-foreground",
        outline: "border-border text-muted-foreground [a&]:hover:text-foreground",
        destructive:
          "border-destructive/30 bg-transparent text-destructive [a&]:hover:bg-destructive/10",
        // Citation-link chip — accent as text only.
        link: "text-accent underline-offset-4 [a&]:hover:underline",
        // Technical metadata (ids, timestamps, model names). Mono, dense, muted.
        metric:
          "border-border bg-surface font-mono text-2xs tracking-tight text-muted-foreground tabular-nums",
        // Relevance / confidence score. Mono, mint text + hairline mint border,
        // NO fill — the accent's headline use.
        score:
          "border-accent/30 bg-transparent font-mono text-2xs tracking-tight text-accent tabular-nums",
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
