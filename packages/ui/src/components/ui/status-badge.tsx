import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { Badge } from "@anpord/ui/components/ui/badge";
import { cn } from "@anpord/ui/lib/utils";

const dotVariants = cva("size-1.5 shrink-0 rounded-full", {
  defaultVariants: {
    tone: "neutral",
  },
  variants: {
    tone: {
      neutral: "bg-muted-foreground",
      pending: "bg-warning",
      positive: "bg-success",
      critical: "bg-destructive",
    },
  },
});

interface StatusBadgeProps extends VariantProps<typeof dotVariants> {
  readonly children: ReactNode;
  readonly className?: string;
}

/** The dot is decoration; the label carries the state for everyone else. */
export function StatusBadge({ children, className, tone }: StatusBadgeProps) {
  return (
    <Badge className={cn(className)} size="sm" variant="secondary">
      <span aria-hidden="true" className={dotVariants({ tone })} />
      {children}
    </Badge>
  );
}
