import { CopyButton } from "@anpord/ui/components/copy-button";
import { RailSection } from "@/components/rail/rail-section";

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
    <RailSection
      action={
        <CopyButton className="size-6" label="Copy snippet" value={code} />
      }
      title="Use this prompt"
    >
      {/* The one surface in the rail that keeps a fill: code is quoted matter,
          and the well is what marks it as something to copy rather than read. */}
      <code className="block overflow-x-auto whitespace-pre rounded-md bg-muted px-2.5 py-2 font-mono text-xs leading-relaxed">
        {tokens(promptId).map((token) => (
          <span className={token.tone} key={token.text}>
            {token.text}
          </span>
        ))}
      </code>
    </RailSection>
  );
}
