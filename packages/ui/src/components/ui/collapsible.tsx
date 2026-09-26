import { cn } from "@anpord/ui/lib/utils";
import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";
import type { ComponentProps } from "react";

const PANEL =
  "h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none";

export const Collapsible = CollapsiblePrimitive.Root;

export const CollapsibleTrigger = CollapsiblePrimitive.Trigger;

export const CollapsiblePanel = ({
  className,
  ...props
}: ComponentProps<typeof CollapsiblePrimitive.Panel>) => (
  <CollapsiblePrimitive.Panel className={cn(PANEL, className)} {...props} />
);
