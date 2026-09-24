import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@anpord/ui/lib/utils";

const headingVariants = cva("truncate", {
  defaultVariants: { size: "page" },
  variants: {
    size: {
      page: "shrink-0 font-heading text-foreground text-xl tracking-tight",
      section: "shrink-0 font-medium text-foreground text-sm",
      label: "font-medium text-2xs text-muted-foreground",
    },
  },
});

export function PageHeading({
  className,
  size,
  title,
}: VariantProps<typeof headingVariants> & {
  readonly className?: string;
  readonly title: string;
}) {
  return <span className={cn(headingVariants({ size }), className)}>{title}</span>;
}
