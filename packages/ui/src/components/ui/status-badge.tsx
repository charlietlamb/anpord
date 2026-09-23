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

const tintVariants = cva("border-transparent shadow-none", {
  defaultVariants: {
    tone: "neutral",
  },
  variants: {
    tone: {
      neutral: "bg-alpha-8 text-muted-foreground",
      pending: "bg-warning/10 text-warning",
      positive: "bg-success/10 text-success",
      critical: "bg-destructive/10 text-destructive",
    },
  },
});

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
        className={cn(tintVariants({ tone }), className)}
        size={size}
        variant="secondary"
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
