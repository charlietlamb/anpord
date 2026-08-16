import { CopyButton } from "@anpord/ui/components/copy-button";
import { RailCard } from "@/components/prompts/rail-card";

interface UsageCardProps {
  readonly promptId: string;
}

const snippet = (promptId: string) =>
  `await anpord.prompts.get({ id: "${promptId}" })`;

export function UsageCard({ promptId }: UsageCardProps) {
  const code = snippet(promptId);

  return (
    <RailCard
      action={
        <CopyButton className="size-6" label="Copy snippet" value={code} />
      }
      title="Use this prompt"
    >
      <code className="block overflow-x-auto whitespace-pre rounded-md bg-muted/60 px-2.5 py-2 font-mono text-[0.75rem] leading-relaxed">
        {code}
      </code>
    </RailCard>
  );
}
