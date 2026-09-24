import { Button } from "@anpord/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@anpord/ui/components/ui/sheet";
import { cn } from "@anpord/ui/lib/utils";
import type { Icon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

export function SideSheet({
  children,
  description,
  flush = false,
  icon: Glyph,
  onClose,
  open,
  title,
  trigger,
}: {
  readonly children: ReactNode;
  readonly description?: ReactNode;
  readonly flush?: boolean;
  readonly icon?: Icon;
  readonly onClose?: () => void;
  readonly open?: boolean;
  readonly title: ReactNode;
  readonly trigger?: string;
}) {
  return (
    <Sheet
      onOpenChange={(next) => {
        if (!next) {
          onClose?.();
        }
      }}
      open={open}
    >
      {trigger === undefined ? null : (
        <SheetTrigger render={<Button size="sm" variant="outline" />}>
          {Glyph === undefined ? null : <Glyph />}
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

        <div className={cn("min-h-0 flex-1 overflow-y-auto", !flush && "p-4")}>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}
