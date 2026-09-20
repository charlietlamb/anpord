import { cn } from "@anpord/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";
import type { ComponentType } from "react";

export interface PageTabOption<T extends string> {
  readonly Icon?: ComponentType<{ readonly className?: string }>;
  readonly label: string;
  readonly value: T;
}

/**
 * The tabs a page or panel is divided into, standing where its title would.
 *
 * A panel whose sections are named in a tab strip does not also need a heading
 * repeating one of those names: each panel names itself.
 */
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
      <Tabs.List className={cn("relative flex items-center gap-0.5", className)}>
        {options.map(({ Icon, label, value: option }) => (
          <Tabs.Tab
            className={cn(
              "relative z-10 flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2.5 font-medium text-muted-foreground text-xs",
              /* 120ms, matching every other tab in the app: pressed and read
                 in the same moment, so the colour lands with the eye. */
              "transition-colors duration-[120ms] ease-out",
              "hover:text-foreground data-[selected]:text-foreground"
            )}
            key={option}
            value={option}
          >
            {Icon ? <Icon className="size-3.5 shrink-0" /> : null}
            {label}
          </Tabs.Tab>
        ))}

        <Tabs.Indicator className="absolute top-0 left-0 h-7 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-md bg-alpha-8 transition-[translate,width] duration-[120ms] ease-out" />
      </Tabs.List>
    </Tabs.Root>
  );
}
