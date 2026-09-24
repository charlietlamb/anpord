import { CopyButton } from "@anpord/ui/components/copy-button";
import {
  StatusBadge,
  type StatusTone,
} from "@anpord/ui/components/ui/status-badge";
import { SURFACE_FILL } from "@anpord/ui/lib/surface";
import { cn } from "@anpord/ui/lib/utils";
import { Collapsible } from "@base-ui/react/collapsible";
import {
  CaretDownIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  type Icon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { ComponentProps, ReactNode } from "react";

export type ToolState = "completed" | "error" | "running";

const PANEL =
  "h-[var(--collapsible-panel-height)] overflow-hidden transition-[height] duration-200 ease-out data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none";

export const Tool = ({
  className,
  ...props
}: ComponentProps<typeof Collapsible.Root>) => (
  <Collapsible.Root
    className={cn("group/tool w-full rounded-lg", SURFACE_FILL, className)}
    {...props}
  />
);

const STATES: Record<
  ToolState,
  {
    readonly className?: string;
    readonly Glyph: Icon;
    readonly label: string;
    readonly tone: StatusTone;
  }
> = {
  completed: { Glyph: CheckCircleIcon, label: "Completed", tone: "positive" },
  error: { Glyph: XCircleIcon, label: "Error", tone: "destructive" },
  running: {
    className: "[&>svg]:animate-spin motion-reduce:[&>svg]:animate-none",
    Glyph: CircleNotchIcon,
    label: "Running",
    tone: "secondary",
  },
};

export function ToolStatus({
  label,
  state,
}: {
  readonly label?: string;
  readonly state: ToolState;
}) {
  const { className, Glyph, label: named, tone } = STATES[state];

  return (
    <StatusBadge className={className} icon={Glyph} tone={tone}>
      {label ?? named}
    </StatusBadge>
  );
}

export const ToolHeader = ({
  className,
  icon,
  meta,
  state,
  status,
  title,
  ...props
}: Omit<ComponentProps<typeof Collapsible.Trigger>, "title"> & {
  readonly icon: ReactNode;
  readonly meta?: ReactNode;
  readonly state: ToolState;
  readonly status?: string;
  readonly title: ReactNode;
}) => (
  <Collapsible.Trigger
    className={cn(
      "flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left",
      className
    )}
    {...props}
  >
    {icon}
    <span className="min-w-0 flex-1 truncate font-medium text-foreground text-label">
      {title}
    </span>
    {meta === undefined ? null : (
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
        {meta}
      </span>
    )}
    <ToolStatus label={status} state={state} />
    <CaretDownIcon
      aria-hidden="true"
      className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[open]/tool:rotate-180 motion-reduce:transition-none"
    />
  </Collapsible.Trigger>
);

export const ToolContent = ({
  children,
  className,
  ...props
}: ComponentProps<typeof Collapsible.Panel>) => (
  <Collapsible.Panel className={cn(PANEL, className)} {...props}>
    <div className="flex flex-col gap-3 border-t p-3">{children}</div>
  </Collapsible.Panel>
);

export function ToolSection({
  children,
  copy,
  label,
  tone = "plain",
  truncated = false,
}: {
  readonly children: ReactNode;
  readonly copy?: string;
  readonly label: string;
  readonly tone?: "plain" | "warning";
  readonly truncated?: boolean;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <header className="flex h-5 items-center justify-between">
        <h4 className="font-medium text-muted-foreground text-xs">{label}</h4>
        {copy === undefined ? null : (
          <CopyButton
            label={`Copy ${label.toLowerCase()}`}
            size="inline"
            value={copy}
          />
        )}
      </header>
      <pre
        className={cn(
          "max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg p-3 font-mono text-xs leading-relaxed [scrollbar-width:thin]",
          SURFACE_FILL,
          tone === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {children}
        {truncated ? <span className="text-warning"> [truncated]</span> : null}
      </pre>
    </section>
  );
}

const present = (text: string | undefined): text is string =>
  text !== undefined && text !== "";

export const ToolInput = ({
  input,
  truncated,
}: {
  readonly input: string | undefined;
  readonly truncated?: boolean;
}) =>
  present(input) ? (
    <ToolSection copy={input} label="Parameters" truncated={truncated}>
      {input}
    </ToolSection>
  ) : null;

export const ToolOutput = ({
  errorText,
  output,
  truncated,
}: {
  readonly errorText?: string;
  readonly output: string | undefined;
  readonly truncated?: boolean;
}) => {
  if (!(present(errorText) || present(output))) {
    return <p className="text-muted-foreground text-xs">No output</p>;
  }

  return (
    <>
      {present(errorText) ? (
        <ToolSection copy={errorText} label="Error" tone="warning">
          {errorText}
        </ToolSection>
      ) : null}
      {present(output) ? (
        <ToolSection copy={output} label="Result" truncated={truncated}>
          {output}
        </ToolSection>
      ) : null}
    </>
  );
};
