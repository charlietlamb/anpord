import { cn } from "@anpord/ui/lib/utils";

interface IdentityLabelProps {
  className?: string;
  subtitle?: string;
  title: string;
}

export function IdentityLabel({
  title,
  subtitle,
  className,
}: IdentityLabelProps) {
  return (
    <div className={cn("grid flex-1 text-left leading-tight", className)}>
      <span className="truncate font-medium text-sm">{title}</span>
      {subtitle ? (
        <span className="truncate text-muted-foreground text-xs">
          {subtitle}
        </span>
      ) : null}
    </div>
  );
}
