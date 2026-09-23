import { cva, type VariantProps } from "class-variance-authority";
import type { Icon } from "@phosphor-icons/react";
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

const TONE_VARIANTS = {
  critical: "destructive",
  neutral: "secondary",
  pending: "pending",
  positive: "positive",
} as const;

interface StatusBadgeProps extends VariantProps<typeof dotVariants> {
  readonly children: ReactNode;
  readonly className?: string;
  readonly icon?: Icon;
  /** "xs" is 20px tall with 10px type, which is what a dense row needs: the
   * badge is the tallest thing in it, so it decides the row height. */
  readonly size?: "sm" | "xs";
}

/** The dot is decoration; the label carries the state for everyone else. */
export function StatusBadge({
  children,
  className,
  icon: Glyph,
  size = "sm",
  tone,
}: StatusBadgeProps) {
  if (Glyph) {
    return (
      <Badge
        className={className}
        size={size}
        variant={TONE_VARIANTS[tone ?? "neutral"]}
      >
        <Glyph aria-hidden="true" weight="fill" />
        {children}
      </Badge>
    );
  }

  return (
    <Badge className={cn(className)} size={size} variant="secondary">
      <span aria-hidden="true" className={dotVariants({ tone })} />
      {children}
    </Badge>
  );
}
