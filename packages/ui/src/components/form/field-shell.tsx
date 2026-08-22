import { FieldInfo } from "@anpord/ui/components/form/field-info";
import { Label } from "@anpord/ui/components/ui/label";
import { cn } from "@anpord/ui/lib/utils";
import type { AnyFieldApi } from "@tanstack/react-form";
import type { ReactNode } from "react";

/**
 * A label, a control, and what is wrong with it.
 *
 * Every field component had written this three-line grid itself, so a change
 * to how an error sits under a control was four edits. The description sits
 * above the control rather than below it, because a hint that arrives after
 * the answer is a hint nobody read.
 */
export function FieldShell({
  children,
  className,
  description,
  field,
  label,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly description?: string;
  readonly field: AnyFieldApi;
  readonly label: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={field.name}>{label}</Label>

      {description === undefined ? null : (
        <p className="text-muted-foreground text-xs">{description}</p>
      )}

      {children}
      <FieldInfo field={field} />
    </div>
  );
}
