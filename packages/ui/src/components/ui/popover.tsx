import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { POPUP, POPUP_MOTION } from "@anpord/ui/lib/popup";
import { cn } from "@anpord/ui/lib/utils";

export function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export function PopoverContent({
  align = "center",
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        className="isolate z-50 outline-none"
        side={side}
        sideOffset={sideOffset}
      >
        <PopoverPrimitive.Popup
          className={cn(
            "max-h-(--available-height) max-w-(--available-width) p-4",
            POPUP,
            POPUP_MOTION,
            className
          )}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
