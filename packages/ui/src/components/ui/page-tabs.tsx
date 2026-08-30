import { cn } from "@anpord/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";

/**
 * The tabs a page is divided into, standing where its title would.
 *
 * A page whose sections are named in a tab strip does not also need a heading
 * repeating one of those names: the breadcrumb above already says where the
 * reader is, and each panel names itself. Two headers stacked is the thing
 * this replaces.
 */
export function PageTabs<T extends string>({
  className,
  onChange,
  options,
  value,
}: {
  readonly className?: string;
  readonly onChange: (value: T) => void;
  readonly options: readonly { readonly label: string; readonly value: T }[];
  readonly value: T;
}) {
  return (
    <Tabs.Root
      onValueChange={(next) => onChange(next as T)}
      render={<div />}
      value={value}
    >
      <Tabs.List className={cn("relative flex items-center gap-1", className)}>
        {options.map((option) => (
          <Tabs.Tab
            className={cn(
              "h-8 rounded-md px-2.5 font-medium text-muted-foreground text-sm",
              /* 120ms, matching every other tab in the app: pressed and read
                 in the same moment, so the colour lands with the eye. */
              "transition-colors duration-[120ms] ease-out",
              "hover:text-foreground data-[selected]:text-foreground"
            )}
            key={option.value}
            value={option.value}
          >
            {option.label}
          </Tabs.Tab>
        ))}

        <Tabs.Indicator
          className="absolute bottom-0 left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] bg-foreground transition-[translate,width] duration-[120ms] ease-out"
          renderBeforeHydration
        />
      </Tabs.List>
    </Tabs.Root>
  );
}
