import type { EvalUsage } from "@anpord/schema/domain/evals";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LightningIcon,
  StackIcon,
} from "@phosphor-icons/react";
import { count } from "@/lib/evals/duration";
import { percent } from "@/lib/evals/tokens";

/**
 * What the trial used, and which direction it used it.
 *
 * Tokens rather than money: what a layer cost is four separate answers with
 * four different bases, and CostBreakdown is where they are kept apart. A
 * single figure beside these would read as the total of all of them.
 *
 * The split is the interesting half. 260,000 read against 12,717 written says
 * the agent is re-reading a large context rather than generating one, and a
 * total alone cannot say which. The bars carry the ratio so nobody has to
 * divide.
 */
export function TrialCost({ usage }: { readonly usage: EvalUsage }) {
  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  return (
    <div className="flex flex-col">
      {usage.cacheReadTokens === 0 ? null : (
        <RailFact
          detail={<ShareBar of={served} value={usage.cacheReadTokens} />}
          hint="The share of everything the model was given that came from cache. A cached read costs about a tenth of fresh input, so this is most of the difference between a first run and a repeat."
          Icon={LightningIcon}
          label="cache hit rate"
          layout="stated"
          value={`${percent(usage.cacheReadTokens / served)} cached`}
        />
      )}

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
