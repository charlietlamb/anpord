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

export type StatusTone = NonNullable<
  VariantProps<typeof dotVariants>["tone"]
>;

/** The state as a mark rather than a pill, for a column of icon-led rows where
 * a filled badge is the only thing with an edge and reads as a foreign
 * object. */
export function StatusDot({
  className,
  tone,
}: {
  readonly className?: string;
  readonly tone?: StatusTone;
}) {
  return (
    <span aria-hidden="true" className={cn(dotVariants({ tone }), className)} />
  );
}

interface StatusBadgeProps extends VariantProps<typeof dotVariants> {
  readonly children: ReactNode;
  readonly className?: string;
  /** "xs" is 20px tall with 10px type, which is what a dense row needs: the
   * badge is the tallest thing in it, so it decides the row height. */
  readonly size?: "sm" | "xs";
}

/** The dot is decoration; the label carries the state for everyone else. */
export function StatusBadge({
  children,
  className,
  size = "sm",
  tone,
}: StatusBadgeProps) {
  return (
    <Badge className={cn(className)} size={size} variant="secondary">
      <span aria-hidden="true" className={dotVariants({ tone })} />
      {children}
    </Badge>
  );
}
