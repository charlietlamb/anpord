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
          "skeleton-static relative isolate flex w-full items-center gap-5 overflow-x-auto border-border border-b",
          className
        )}
      >
        {options.map(({ Icon, label, value: option }) => (
          <Tabs.Tab
            className={cn(
              "relative z-10 flex h-9 shrink-0 cursor-pointer items-center gap-1.5 font-medium text-[13px] text-muted-foreground",
              "transition-colors duration-[120ms] ease-out",
              "hover:text-foreground data-[active]:text-foreground"
            )}
            key={option}
            value={option}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            {label}
          </Tabs.Tab>
        ))}

        <Tabs.Indicator
          className={cn(
            "absolute -bottom-px left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-full bg-foreground transition-[translate,width] duration-[120ms] ease-out"
          )}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
