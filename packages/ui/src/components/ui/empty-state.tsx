import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { cn } from "@anpord/ui/lib/utils";

const emptyStateVariants = cva(
  "m-auto flex w-full max-w-md flex-none flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center text-balance",
  {
    defaultVariants: { frame: "bordered" },
    variants: {
      frame: {
        bare: "",
        bordered: "border border-border",
      },
    },
  }
);

export function EmptyState({
  action,
  className,
  description,
  frame,
  icon,
  title,
}: VariantProps<typeof emptyStateVariants> & {
  readonly action?: ReactNode;
  readonly className?: string;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly title: string;
}) {
  return (
    <div className={cn(emptyStateVariants({ frame }), className)}>
      {icon === undefined ? null : (
        <div className="flex size-8 items-center justify-center rounded-md bg-alpha-8 text-foreground [&_svg:not([class*='size-'])]:size-4">
          {icon}
        </div>
      )}
      <div className="flex max-w-sm flex-col items-center gap-1">
        <p className="font-heading font-medium text-sm">{title}</p>
        {description === undefined ? null : (
          <p className="text-muted-foreground text-xs/relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
