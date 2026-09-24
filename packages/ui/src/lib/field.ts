import { cva } from "class-variance-authority";

export const FIELD_SURFACE =
  "rounded-lg border border-border bg-background outline-none transition-[color,background-color,border-color,box-shadow] duration-150 ease-out focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/20 focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 dark:bg-input/30";

export const fieldVariants = cva(
  `${FIELD_SURFACE} w-full min-w-0 px-3 text-sm placeholder:text-muted-foreground/70 disabled:pointer-events-none disabled:opacity-50`,
  {
    defaultVariants: { size: "default" },
    variants: {
      size: {
        sm: "h-7 text-xs",
        default: "h-[1.875rem]",
        lg: "h-10",
      },
    },
  }
);
