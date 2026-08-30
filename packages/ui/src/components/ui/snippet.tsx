import { CopyButton } from "@anpord/ui/components/copy-button";
import { cn } from "@anpord/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";
import { useState } from "react";

export interface SnippetCommand {
  /** What runs. Also what the copy button puts on the clipboard. */
  readonly command: string;
  readonly label: string;
}

/**
 * One command, told several ways.
 *
 * A package manager is the reader's, not ours, so the install line is shown
 * per manager rather than picking one and hoping. Built on the tabs primitive
 * already in this package: the published version of this component brings
 * Radix and Lucide with it, which would put a second tabs implementation and
 * a second icon set in a repository that has one of each.
 */
export function Snippet({
  className,
  commands,
}: {
  readonly className?: string;
  readonly commands: readonly SnippetCommand[];
}) {
  const [value, setValue] = useState(commands[0]?.label ?? "");
  const active =
    commands.find((command) => command.label === value) ?? commands[0];

  return (
    <div className={cn("relative", className)}>
      <Tabs.Root onValueChange={(next) => setValue(String(next))} value={value}>
        <div className="px-3">
          <Tabs.List className="relative flex h-10 items-center">
            {commands.map((command) => (
              <Tabs.Tab
                className={cn(
                  "h-7 rounded-md px-2 font-mono text-muted-foreground text-sm",
                  /* 120ms: a tab is pressed and read in the same moment, so
                     the colour has to arrive by the time the eye does. */
                  "transition-colors duration-[120ms] ease-out",
                  "hover:text-foreground data-[selected]:text-foreground"
                )}
                key={command.label}
                value={command.label}
              >
                {command.label}
              </Tabs.Tab>
            ))}

            {/* An underline that slides between tabs rather than cutting,
                which is the one place movement helps: it says the two are the
                same control. */}
            <Tabs.Indicator
              className="absolute bottom-0 left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] bg-foreground transition-[translate,width] duration-[120ms] ease-out"
              renderBeforeHydration
            />
          </Tabs.List>
        </div>

        {commands.map((command) => (
          <Tabs.Panel key={command.label} value={command.label}>
            <div className="rounded-[9px] border border-border-faint bg-background">
              {/* The prompt is drawn rather than written, so it cannot end up
                  on the clipboard. */}
              <pre className="overflow-x-auto overscroll-x-contain px-3 py-3 font-mono text-muted-foreground text-sm leading-none before:mr-2 before:select-none before:text-muted-foreground/50 before:content-['$']">
                {command.command}
              </pre>
            </div>
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      {/* One button rather than one per panel: it copies whatever is showing,
          and a row of identical buttons would only ever have one visible. */}
      {active ? (
        <CopyButton
          className="absolute top-1.5 right-0.5 z-10 size-7"
          label={`Copy ${active.label} command`}
          value={active.command}
        />
      ) : null}
    </div>
  );
}
