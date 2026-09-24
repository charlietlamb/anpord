import type { EvalUsage } from "@anpord/schema/domain/evals";
import {
  CONCERN_REASONS,
  usageConcerns,
} from "@anpord/schema/domain/usage-health";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LightningIcon,
  StackIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { count } from "@/lib/evals/duration";
import { percent } from "@/lib/evals/tokens";

export function TrialCost({
  turns,
  usage,
}: {
  readonly turns: number;
  readonly usage: EvalUsage;
}) {
  const concerns = usageConcerns({ turns, usage });
  const served =
    usage.inputTokens + usage.cacheReadTokens + usage.cacheWriteTokens;

  return (
    <div className="flex flex-col">
      {served === 0 ? null : (
        <RailFact
          detail={<ShareBar of={served} value={usage.cacheReadTokens} />}
          hint="The share of everything the model was given that came from cache. A cached read costs about a tenth of fresh input, so this is most of the difference between a first run and a repeat. Nothing cached means every turn paid full price for the turns before it."
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

      {concerns.map((concern) => (
        <RailFact
          hint={CONCERN_REASONS[concern]}
          Icon={WarningIcon}
          key={concern}
          label="spend"
          layout="stated"
          tone="warning"
          value={
            concern === "nothing-cached"
              ? "nothing cached"
              : "context grew fast"
          }
        />
      ))}
    </div>
  );
}
