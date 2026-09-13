import { Label } from "@anpord/ui/components/ui/label";
import { cn } from "@anpord/ui/lib/utils";
import type { ReactNode } from "react";

export function LabelledField({
  children,
  className,
  description,
  htmlFor,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly htmlFor: string;
  readonly label: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>

      {description === undefined ? null : (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}

      {children}
    </div>
  );
}
