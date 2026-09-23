import { Button } from "@anpord/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@anpord/ui/components/ui/sheet";
import type { ReactNode } from "react";

export function SideSheet({
  children,
  description,
  onOpenChange,
  open,
  title,
  trigger,
}: {
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly onOpenChange?: (open: boolean) => void;
  readonly open?: boolean;
  readonly title: ReactNode;
  readonly trigger?: ReactNode;
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      {trigger === undefined ? null : (
        <SheetTrigger render={<Button size="sm" variant="outline" />}>
          {trigger}
        </SheetTrigger>
      )}

      <SheetContent>
        <SheetHeader className="gap-1 border-border border-b p-4 pr-12">
          <SheetTitle>{title}</SheetTitle>
          {description === undefined ? null : (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
