import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useCopy } from "@sphynx/ui/hooks/use-copy";

const COMMAND = "npx sphynx-sh eval";

export function CopyCommand() {
  const { copied, copy } = useCopy();

  return (
    <button
      aria-label={`Copy ${COMMAND}`}
      className="flex h-9 items-center gap-3 rounded-[4px] bg-foreground/[0.03] pr-3 pl-3.5 font-mono text-[13px] ring-1 ring-foreground/15 ring-inset transition-colors duration-150 hover:bg-foreground/[0.06]"
      onClick={() => copy(COMMAND)}
      type="button"
    >
      <span>
        <span className="text-muted-foreground/60">$</span>{" "}
        <span className="text-foreground">{COMMAND}</span>
      </span>
      {copied ? (
        <CheckIcon className="size-3.5 text-muted-foreground" weight="bold" />
      ) : (
        <CopyIcon className="size-3.5 text-muted-foreground" />
      )}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
