import { Button } from "@anpord/ui/components/button";
import { CopyButton } from "@anpord/ui/components/copy-button";
import { cn } from "@anpord/ui/lib/utils";
import { Tabs } from "@base-ui/react/tabs";
import { XIcon } from "@phosphor-icons/react";
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
 * per manager rather than picking one and hoping.
 *
 * Ported rather than installed: the published component keeps the chosen
 * manager in a jotai atom and animates its icon with motion, which is two
 * dependencies and a second state library for a control that remembers one
 * word. Local state does the same thing here, and the tabs come from the
 * primitive this package already has.
 */
export function Snippet({
  className,
  commands,
  onDismiss,
}: {
  readonly className?: string;
  readonly commands: readonly SnippetCommand[];
  /** Offered where the reader has no further use for it -- an SDK is
   * installed once, and a box that stays forever is a box in the way. */
  readonly onDismiss?: () => void;
}) {
  const [value, setValue] = useState(commands[0]?.label ?? "");
  const active =
    commands.find((command) => command.label === value) ?? commands[0];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/40",
        className
      )}
    >
      <Tabs.Root onValueChange={(next) => setValue(String(next))} value={value}>
        {/* The rule under the tab row is an inset shadow rather than a border,
            so it sits inside the rounded corners instead of cutting across
            them. */}
        <Tabs.List className="relative flex h-10 max-w-full items-center justify-start gap-1 pr-10 pl-4 shadow-[inset_0_-1px_0_0] shadow-border-faint">
          {commands.map((command) => (
            <Tabs.Tab
              className={cn(
                "h-7 rounded-lg px-2 font-mono text-muted-foreground text-sm",
                /* 120ms: a tab is pressed and read in the same moment, so the
                   colour has to arrive by the time the eye does. */
                "transition-colors duration-[120ms] ease-out",
                "hover:text-foreground data-[selected]:text-foreground"
              )}
              key={command.label}
              value={command.label}
            >
              {command.label}
            </Tabs.Tab>
          ))}

          {/* Slides between tabs rather than cutting, which is the one place
              movement helps: it says the two are the same control. */}
          <Tabs.Indicator
            className="absolute bottom-0 left-0 h-0.5 w-[var(--active-tab-width)] translate-x-[var(--active-tab-left)] bg-foreground transition-[translate,width] duration-[120ms] ease-out"
            renderBeforeHydration
          />
        </Tabs.List>

        {commands.map((command) => (
          <Tabs.Panel key={command.label} value={command.label}>
            <pre className="overflow-x-auto p-4 leading-6">
              <code className="font-mono text-muted-foreground text-sm/none">
                {/* Unselectable, so a copy by hand leaves the prompt behind
                    the way the button does. */}
                <span className="select-none text-muted-foreground/50">
                  ${" "}
                </span>
                {command.command}
              </code>
            </pre>
          </Tabs.Panel>
        ))}
      </Tabs.Root>

      {/* One button rather than one per panel: it copies whatever is showing,
          and a row of identical buttons would only ever have one visible. */}
      {active ? (
        <span className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
          <CopyButton
            className="size-6"
            label={`Copy ${active.label} command`}
            value={active.command}
          />

          {onDismiss ? (
            <Button
              aria-label="Hide the install command"
              className="size-6 text-muted-foreground"
              onClick={onDismiss}
              size="icon-sm"
              type="button"
              variant="bare"
            >
              <XIcon className="size-3.5" />
            </Button>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
