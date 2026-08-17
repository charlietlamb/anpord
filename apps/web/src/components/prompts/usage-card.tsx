import { CopyButton } from "@anpord/ui/components/copy-button";
import { RailCard } from "@/components/rail/rail-card";

interface UsageCardProps {
  readonly promptId: string;
}

const snippet = (promptId: string) =>
  `await anpord.prompts.get({ id: "${promptId}" })`;

/** The call is a fixed shape, so its parts are named rather than parsed. */
const tokens = (promptId: string) =>
  [
    { text: "await", tone: "text-[var(--code-keyword)]" },
    { text: " anpord", tone: "text-foreground/85" },
    { text: ".prompts", tone: "text-foreground/85" },
    { text: ".", tone: "text-muted-foreground" },
    { text: "get", tone: "text-[var(--code-call)]" },
    { text: "({ ", tone: "text-muted-foreground" },
    { text: "id", tone: "text-[var(--code-key)]" },
    { text: ": ", tone: "text-muted-foreground" },
    { text: `"${promptId}"`, tone: "text-[var(--code-string)]" },
    { text: " })", tone: "text-muted-foreground" },
  ] as const;

export function UsageCard({ promptId }: UsageCardProps) {
  const code = snippet(promptId);

  return (
    <RailCard
      action={
        <CopyButton className="size-6" label="Copy snippet" value={code} />
      }
      className="px-0 py-0"
      title="Use this prompt"
    >
      <code className="block overflow-x-auto whitespace-pre bg-muted px-3.5 py-2.5 font-mono text-[0.75rem] leading-relaxed">
        {tokens(promptId).map((token) => (
          <span className={token.tone} key={token.text}>
            {token.text}
          </span>
        ))}
      </code>
    </RailCard>
  );
}
