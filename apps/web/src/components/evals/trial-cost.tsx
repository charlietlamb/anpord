import type { EvalUsage } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import { ArrowDownIcon, ArrowUpIcon, StackIcon } from "@phosphor-icons/react";
import { count } from "@/lib/evals/duration";

/**
 * What the trial spent, and which direction it spent it.
 *
 * The split is the interesting half. 260,000 read against 12,717 written says
 * the agent is re-reading a large context rather than generating one, and a
 * total alone cannot say which. The bars carry the ratio so nobody has to
 * divide.
 */
export function TrialCost({ usage }: { readonly usage: EvalUsage }) {
  return (
    <div className="flex flex-col">
      <RailFact
        hint="Everything the model read and wrote across the trial."
        Icon={StackIcon}
        label="tokens"
        layout="stated"
        value={`${count(usage.totalTokens)} tokens`}
      />
      <RailFact
        detail={<ShareBar of={usage.totalTokens} value={usage.inputTokens} />}
        hint="The prompt and everything the agent read back: files, command output, its own earlier turns."
        Icon={ArrowDownIcon}
        label="input tokens"
        layout="stated"
        value={`${count(usage.inputTokens)} in`}
      />
      <RailFact
        detail={<ShareBar of={usage.totalTokens} value={usage.outputTokens} />}
        hint="What the model wrote: its reasoning, its messages and the commands it chose to run."
        Icon={ArrowUpIcon}
        label="output tokens"
        layout="stated"
        value={`${count(usage.outputTokens)} out`}
      />
    </div>
  );
}
