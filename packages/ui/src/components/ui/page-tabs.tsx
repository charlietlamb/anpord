import { SURFACE_FILL } from "@sphynx/ui/lib/surface";
import { cn } from "@sphynx/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";
import type { ComponentType } from "react";

export interface PageTabOption<T extends string> {
  readonly Icon?: ComponentType<{ readonly className?: string }>;
  readonly label: string;
  readonly value: T;
}

const LOOKS = {
  segmented: {
    indicator: `absolute top-1 left-0 h-7 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-md transition-[translate,width] duration-[120ms] ease-out ${SURFACE_FILL}`,
    list: "w-fit max-w-full gap-0.5 rounded-lg bg-muted p-1 dark:bg-card",
    tab: "h-7 rounded-md px-2.5 text-xs",
  },
  underline: {
    indicator:
      "absolute -bottom-px left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] rounded-full bg-foreground transition-[translate,width] duration-[120ms] ease-out",
    list: "w-full gap-5 border-border border-b",
    tab: "h-9 shrink-0 text-[13px]",
  },
} as const;

export function PageTabs<T extends string>({
  className,
  onChange,
  onIntent,
  options,
  value,
  variant = "segmented",
}: {
  readonly className?: string;
  readonly onChange: (value: T) => void;
  readonly onIntent?: () => void;
  readonly options: readonly PageTabOption<T>[];
  readonly value: T;
  readonly variant?: keyof typeof LOOKS;
}) {
  const look = LOOKS[variant];

  return (
    <Tabs.Root
      onValueChange={(next) => onChange(next as T)}
      render={<div />}
      value={value}
    >
      <Tabs.List
        className={cn(
          "skeleton-static relative isolate flex items-center overflow-x-auto",
          look.list,
          className
        )}
        onFocus={onIntent}
        onPointerEnter={onIntent}
      >
        {options.map(({ Icon, label, value: option }) => (
          <Tabs.Tab
            className={cn(
              "relative z-10 flex cursor-pointer items-center gap-1.5 font-medium text-muted-foreground",
              look.tab,
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
          className={look.indicator}
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
