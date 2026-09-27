import type { EvalUsage } from "@anpord/schema/domain/eval-trial";
import {
  CONCERN_REASONS,
  cacheHitOf,
  usageConcerns,
} from "@anpord/schema/domain/usage-health";
import { RailFact } from "@anpord/ui/components/ui/rail-fact";
import { ShareBar } from "@anpord/ui/components/ui/share-bar";
import { count } from "@anpord/ui/lib/evals/duration";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  LightningIcon,
  StackIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { percent } from "@/lib/evals/tokens";

export function TrialCost({
  turns,
  usage,
}: {
  readonly turns: number;
  readonly usage: EvalUsage;
}) {
  const concerns = usageConcerns({ turns, usage });
  const hit = cacheHitOf(usage);

  return (
    <div className="flex flex-col">
      {hit === null ? null : (
        <RailFact
          detail={<ShareBar of={1} value={hit} />}
          hint="The share of everything the model was given that came from cache. A cached read costs about a tenth of fresh input, so this is most of the difference between a first run and a repeat. Nothing cached means every turn paid full price for the turns before it."
          Icon={LightningIcon}
          label="cache hit rate"
          value={`${percent(hit)} cached`}
        />
      )}

      <RailFact
        hint="Everything the model read and wrote across the trial."
        Icon={StackIcon}
        label="tokens"
        value={`${count(usage.totalTokens)} tokens`}
      />
      <RailFact
        detail={<ShareBar of={usage.totalTokens} value={usage.inputTokens} />}
        hint="The prompt and everything the agent read back: files, command output, its own earlier turns."
        Icon={ArrowDownIcon}
        label="input tokens"
        value={`${count(usage.inputTokens)} in`}
      />
      <RailFact
        detail={<ShareBar of={usage.totalTokens} value={usage.outputTokens} />}
        hint="What the model wrote: its reasoning, its messages and the commands it chose to run."
        Icon={ArrowUpIcon}
        label="output tokens"
        value={`${count(usage.outputTokens)} out`}
      />

      {concerns.map((concern) => (
        <RailFact
          hint={CONCERN_REASONS[concern]}
          Icon={WarningIcon}
          key={concern}
          label="spend"
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
