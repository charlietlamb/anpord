import { SURFACE_FILL } from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";
import type { ComponentType } from "react";

export interface PageTabOption<T extends string> {
  readonly Icon?: ComponentType<{ readonly className?: string }>;
  readonly label: string;
  readonly value: T;
}

export function PageTabs<T extends string>({
  className,
  onChange,
  options,
  value,
}: {
  readonly className?: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly PageTabOption<T>[];
  readonly value: T;
}) {
  return (
    <Tabs.Root
      onValueChange={(next) => onChange(next as T)}
      render={<div />}
      value={value}
    >
      <Tabs.List
        className={cn(
          "relative isolate flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted p-1 dark:bg-card",
          className
        )}
      >
        {options.map(({ Icon, label, value: option }) => (
          <Tabs.Tab
            className={cn(
              "relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-muted-foreground text-xs",
              "transition-colors duration-[120ms] ease-out",
              "hover:text-foreground data-[active]:text-foreground"
            )}
            key={option}
            value={option}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
            {label}
          </Tabs.Tab>
        ))}

        <Tabs.Indicator
          className={cn(
            "absolute top-1 left-0 h-7 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-md transition-[translate,width] duration-[120ms] ease-out",
            SURFACE_FILL
          )}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
