import { Button } from "@anpord/ui/components/button";
import { CopyButton } from "@anpord/ui/components/copy-button";
import {
  SURFACE_BODY,
  SURFACE_FRAME,
  SURFACE_HEAD,
} from "@anpord/ui/lib/surface";
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
    <div className={cn("relative", SURFACE_FRAME, className)}>
      <Tabs.Root onValueChange={(next) => setValue(String(next))} value={value}>
        <Tabs.List
          className={cn(
            SURFACE_HEAD,
            "flex max-w-full items-center justify-start gap-1 pr-16 pl-1.5"
          )}
        >
          {commands.map((command) => (
            <Tabs.Tab
              className={cn(
                "h-6 rounded-md px-2 font-mono",
                "transition-colors duration-[120ms] ease-out",
                "hover:text-foreground data-[active]:bg-alpha-8 data-[active]:text-foreground"
              )}
              key={command.label}
              value={command.label}
            >
              {command.label}
            </Tabs.Tab>
          ))}

        </Tabs.List>

        {commands.map((command) => (
          <Tabs.Panel
            className={SURFACE_BODY}
            key={command.label}
            value={command.label}
          >
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
        <span className="absolute top-2.5 right-2 z-10 flex items-center gap-0.5">
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
