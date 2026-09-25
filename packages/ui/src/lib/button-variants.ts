import { SURFACE_RAISED } from "@anpord/ui/lib/surface";
import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding font-medium tracking-[-0.01em] outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "skeleton:skeleton-block bg-foreground text-background shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.15),0_1px_2px_0_rgb(0_0_0/0.4)] hover:bg-foreground/90",
        outline: `skeleton:skeleton-block ${SURFACE_RAISED} text-foreground hover:bg-alpha-4 aria-expanded:bg-alpha-4`,
        ghost:
          "hover:bg-alpha-4 hover:text-foreground aria-expanded:bg-alpha-4",
        bare: "text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
        subtle:
          "skeleton:skeleton-block border-border bg-alpha-4 text-muted-foreground hover:bg-alpha-8 hover:text-foreground aria-expanded:bg-alpha-8",
        raised:
          "skeleton:skeleton-block border-0 bg-[linear-gradient(to_bottom,var(--foreground),color-mix(in_oklch,var(--foreground)_93%,var(--background)))] text-background shadow-[inset_0_1px_0_0_rgb(255_255_255/0.16),0_1px_2px_0_rgb(0_0_0/0.2),0_6px_16px_-6px_rgb(0_0_0/0.45)] transition-[filter,box-shadow] hover:brightness-110 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255),inset_0_-1px_0_0_rgb(0_0_0/0.18),0_0_0_1px_rgb(0_0_0/0.7)]",
        glass:
          "skeleton:skeleton-block border-0 bg-[linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_9%,transparent),color-mix(in_oklch,var(--foreground)_4%,transparent))] text-foreground shadow-[inset_0_1px_0_0_rgb(255_255_255/0.6),inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_12%,transparent),0_1px_2px_0_rgb(0_0_0/0.08)] backdrop-blur-md transition-[filter,box-shadow] hover:brightness-125 dark:shadow-[inset_0_1px_0_0_rgb(255_255_255/0.12),inset_0_0_0_1px_rgb(255_255_255/0.08),0_1px_3px_0_rgb(0_0_0/0.5)]",
        destructive:
          "skeleton:skeleton-block border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/20",
      },
      size: {
        default: "h-[1.875rem] gap-2 px-5 text-sm",
        sm: "h-7 gap-1.5 rounded-md px-3.5 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-5 text-sm",
        xl: "h-11 gap-2 rounded-full px-5 text-[15px]",
        icon: "size-[1.875rem]",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        "icon-round":
          "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
