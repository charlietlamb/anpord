import { cn } from "@anpord/ui/lib/utils";
import { Collapsible } from "@base-ui/react/collapsible";
import { CaretDownIcon, type Icon } from "@phosphor-icons/react";
import type { ComponentProps } from "react";

const PANEL =
  "h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none";

export const Task = ({
  className,
  ...props
}: ComponentProps<typeof Collapsible.Root>) => (
  <Collapsible.Root className={cn("group/task w-full", className)} {...props} />
);

export const TaskTrigger = ({
  className,
  icon: Glyph,
  title,
  ...props
}: Omit<ComponentProps<typeof Collapsible.Trigger>, "title"> & {
  readonly icon: Icon;
  readonly title: string;
}) => (
  <Collapsible.Trigger
    className={cn(
      "flex w-fit max-w-full cursor-pointer items-center gap-2 text-left text-muted-foreground text-sm transition-colors hover:text-foreground",
      className
    )}
    {...props}
  >
    <Glyph aria-hidden="true" className="size-4 shrink-0" />
    <span className="min-w-0 truncate">{title}</span>
    <CaretDownIcon
      aria-hidden="true"
      className="size-4 shrink-0 transition-transform group-data-[open]/task:rotate-180 motion-reduce:transition-none"
    />
  </Collapsible.Trigger>
);

export const TaskContent = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Collapsible.Panel>) => (
  <Collapsible.Panel className={cn(PANEL, className)} {...props}>
    <ol className="mt-3 flex flex-col gap-2 border-border border-l-2 pl-4">
      {children}
    </ol>
  </Collapsible.Panel>
);

export const TaskItem = ({ className, ...props }: ComponentProps<"li">) => (
  <li className={cn("min-w-0", className)} {...props} />
);
