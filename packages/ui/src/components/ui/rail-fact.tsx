import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@anpord/ui/components/tooltip";
import { cn } from "@anpord/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentType, ReactNode } from "react";

export type RailIcon = ComponentType<{ readonly className?: string }>;

const railIconVariants = cva("size-3.5 shrink-0", {
  variants: {
    tone: {
      critical: "text-destructive",
      muted: "text-muted-foreground/80",
      neutral: "text-muted-foreground/80",
      positive: "text-success",
      warning: "text-warning",
    },
  },
  defaultVariants: { tone: "neutral" },
});

const railValueVariants = cva(
  "flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 tabular-nums",
  {
    variants: {
      tone: {
        critical: "text-foreground",
        muted: "text-muted-foreground",
        neutral: "text-foreground",
        positive: "text-foreground",
        warning: "text-warning",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

interface RailFactProps extends VariantProps<typeof railIconVariants> {
  readonly detail?: ReactNode;
  readonly hint?: ReactNode;
  readonly Icon?: RailIcon;
  readonly label: string;
  readonly value: ReactNode;
}

export function RailFact({
  detail,
  hint,
  Icon,
  label,
  tone,
  value,
}: RailFactProps) {
  const row = (
    <div
      aria-label={label}
      className={cn(
        "flex h-6 items-center gap-2 rounded-sm text-xs",
        hint !== undefined &&
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
      role={hint === undefined ? undefined : "note"}
      tabIndex={hint === undefined ? undefined : 0}
    >
      {Icon === undefined ? null : (
        <Icon className={railIconVariants({ tone })} />
      )}
      <span className={railValueVariants({ tone })}>{value}</span>
      {detail}
    </div>
  );

  if (hint === undefined) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent className="max-w-72" side="left">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
