import {
  MENU_ITEM,
  MENU_LABEL,
  MENU_SEPARATOR,
  POPUP,
  POPUP_MOTION,
} from "@anpord/ui/lib/popup";
import { cn } from "@anpord/ui/lib/utils";
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import type * as React from "react";

const MENU_ITEM_CLASS = cn("group/dropdown-menu-item", MENU_ITEM);

export function DropdownMenu({ ...props }: MenuPrimitive.Root.Props) {
  return <MenuPrimitive.Root {...props} />;
}

export function DropdownMenuTrigger({ ...props }: MenuPrimitive.Trigger.Props) {
  return <MenuPrimitive.Trigger {...props} />;
}

export function DropdownMenuSub({ ...props }: MenuPrimitive.SubmenuRoot.Props) {
  return <MenuPrimitive.SubmenuRoot {...props} />;
}

export function DropdownMenuSubTrigger({
  className,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      className={cn(MENU_ITEM_CLASS, className)}
      {...props}
    />
  );
}

export function DropdownMenuSubContent({
  align = "start",
  side = "right",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "max-h-(--available-height) min-w-48 max-w-(--available-width) overflow-y-auto p-1",
            POPUP,
            POPUP_MOTION,
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuContent({
  align = "start",
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: MenuPrimitive.Popup.Props &
  Pick<MenuPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        align={align}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          className={cn(
            "max-h-(--available-height) min-w-(--anchor-width) max-w-(--available-width) overflow-y-auto p-1",
            POPUP,
            POPUP_MOTION,
            className
          )}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

export function DropdownMenuGroup({ ...props }: MenuPrimitive.Group.Props) {
  return <MenuPrimitive.Group {...props} />;
}

export function DropdownMenuLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      className={cn(
        MENU_LABEL,
        "-mx-1 mt-1 border-border border-t first:mt-0 first:border-t-0 first:pt-1",
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item className={cn(MENU_ITEM_CLASS, className)} {...props} />
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      className={cn(MENU_SEPARATOR, className)}
      {...props}
    />
  );
}

export function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "ml-auto text-3xs text-muted-foreground tracking-widest group-focus/dropdown-menu-item:text-accent-foreground",
        className
      )}
      data-slot="dropdown-menu-shortcut"
      {...props}
    />
  );
}
