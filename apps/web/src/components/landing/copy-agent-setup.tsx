import { useCopy } from "@anpord/ui/hooks/use-copy";
import { buttonVariants } from "@anpord/ui/lib/button-variants";
import { cn } from "@anpord/ui/lib/utils";
import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { AGENT_PROMPT } from "@/lib/agent-prompt";

export function CopyAgentSetup() {
  const { copied, copy } = useCopy();

  return (
    <button
      className={cn(buttonVariants({ size: "xl", variant: "glass" }))}
      onClick={() => copy(AGENT_PROMPT)}
      type="button"
    >
      Set up your agent
      {copied ? <CheckIcon weight="bold" /> : <CopyIcon />}
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}
