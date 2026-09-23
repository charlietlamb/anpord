import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { SURFACE_RING } from "@anpord/ui/lib/surface"
import { cn } from "@anpord/ui/lib/utils"

const badgeVariants = cva(
  `group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden border border-border whitespace-nowrap shadow-sm transition-surface ${SURFACE_RING} focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3`,
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/90",
        secondary:
          "bg-card text-foreground dark:bg-muted [a]:hover:bg-alpha-4",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive [a]:hover:bg-destructive/15",
        positive:
          "border-success/25 bg-success/10 text-success [a]:hover:bg-success/15",
        pending:
          "border-warning/25 bg-warning/10 text-warning [a]:hover:bg-warning/15",
        outline:
          "border-border bg-background text-foreground dark:bg-input/30 [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      /* Small badges sit beside small buttons, so they take the same radius
         rather than reading as pills dropped onto the row. */
      size: {
        default: "h-7 rounded-full px-3 text-xs font-semibold",
        sm: "h-6 gap-1.5 rounded-md px-2 text-xs font-medium",
        xs: "h-5 gap-1 rounded-md px-2 text-[0.625rem] font-medium",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

function Badge({
  className,
  size = "default",
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ size, variant }), className),
      },
      props
    ),
    render,
    state: {
      size,
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
