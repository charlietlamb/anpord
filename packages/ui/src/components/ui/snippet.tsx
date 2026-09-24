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
  readonly command: string;
  readonly label: string;
}

export function Snippet({
  className,
  commands,
  onDismiss,
}: {
  readonly className?: string;
  readonly commands: readonly SnippetCommand[];
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
                <span className="select-none text-muted-foreground/50">
                  ${" "}
                </span>
                {command.command}
              </code>
            </pre>
          </Tabs.Panel>
        ))}
      </Tabs.Root>

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
