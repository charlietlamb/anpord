import { SURFACE_RAISED } from "@anpord/ui/lib/surface";
import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding font-medium tracking-[-0.01em] outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-foreground text-background shadow-[inset_0_-1px_0_0_rgb(0_0_0/0.15),0_1px_2px_0_rgb(0_0_0/0.4)] hover:bg-foreground/90",
        outline: `${SURFACE_RAISED} text-foreground hover:bg-alpha-4 aria-expanded:bg-alpha-4`,
        ghost:
          "hover:bg-alpha-4 hover:text-foreground aria-expanded:bg-alpha-4",
        bare: "text-muted-foreground hover:text-foreground aria-expanded:text-foreground",
        subtle:
          "border-border bg-alpha-4 text-muted-foreground hover:bg-alpha-8 hover:text-foreground aria-expanded:bg-alpha-8",
        destructive:
          "border-destructive/25 bg-destructive/10 text-destructive hover:bg-destructive/15 focus-visible:ring-destructive/20",
      },
      size: {
        default: "h-[1.875rem] gap-2 px-5 text-sm",
        sm: "h-7 gap-1.5 rounded-md px-3.5 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-5 text-sm",
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
