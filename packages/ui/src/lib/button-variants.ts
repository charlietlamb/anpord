import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "group/button inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding font-medium tracking-[-0.01em] outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "primary-button-shadow border-primary-border bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "input-bevel-shadow border-border bg-background text-foreground hover:bg-muted aria-expanded:bg-muted dark:bg-input/30",
        secondary:
          "input-bevel-shadow border-border bg-secondary text-secondary-foreground hover:bg-muted",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted dark:hover:bg-muted/50",
        /* An edge at rest and a fill on approach: enough to read as a control
           on an empty page without weighing as much as an outline button. */
        subtle:
          "border-border-faint text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30",
      },
      size: {
        default: "h-[1.875rem] gap-2 px-5 text-sm",
        sm: "h-7 gap-1.5 rounded-md px-3.5 text-sm [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2.5 px-7 text-base [&_svg:not([class*='size-'])]:size-5",
        icon: "size-[1.875rem]",
        "icon-sm": "size-7 rounded-md [&_svg:not([class*='size-'])]:size-3.5",
        /* Round, so a row of them reads as a cluster of actions floated over
           the page rather than a strip of buttons seated in a bar. */
        "icon-round":
          "size-8 rounded-full [&_svg:not([class*='size-'])]:size-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
