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
 * already in this package: the shadcn version of this component brings Radix
 * and Lucide with it, which would put a second tabs implementation and a
 * second icon set in a repository that has one of each.
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
    <Tabs.Root
      className={cn(
        "overflow-hidden rounded-lg border border-border-faint",
        className
      )}
      onValueChange={(next) => setValue(String(next))}
      value={value}
    >
      <div className="flex items-center justify-between gap-2 border-border-faint border-b bg-muted/30 pr-1.5 pl-1">
        <Tabs.List className="flex items-center gap-0.5">
          {commands.map((command) => (
            <Tabs.Tab
              className={cn(
                "rounded-md px-2.5 py-1.5 font-mono text-muted-foreground text-xs transition-colors",
                "hover:text-foreground data-[selected]:bg-alpha-8 data-[selected]:text-foreground"
              )}
              key={command.label}
              value={command.label}
            >
              {command.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        {/* One button rather than one per panel: it copies whatever is
            showing, and a row of identical buttons would only ever have one
            of them visible. */}
        {active ? (
          <CopyButton
            className="size-7 shrink-0"
            label={`Copy ${active.label} command`}
            value={active.command}
          />
        ) : null}
      </div>

      {commands.map((command) => (
        <Tabs.Panel key={command.label} value={command.label}>
          <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-relaxed">
            {command.command}
          </pre>
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
