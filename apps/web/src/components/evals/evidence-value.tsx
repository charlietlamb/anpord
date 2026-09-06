import { CodeBlock } from "@anpord/ui/components/ui/code-block";

const formatValue = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
};

export function EvidenceValue({
  label,
  value,
  truncated,
}: {
  readonly label: string;
  readonly value: string | undefined;
  readonly truncated?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="px-3.5 pt-2 text-muted-foreground text-xs">{label}</dt>
      <dd>
        {value === undefined ? (
          <p className="px-3.5 py-2.5 text-muted-foreground text-xs">
            Not recorded
          </p>
        ) : (
          <CodeBlock copyValue={value} tone="plain">
            {value === "" ? "(empty)" : formatValue(value)}
          </CodeBlock>
        )}
        {truncated ? (
          <p className="px-3.5 pb-2 text-warning text-xs">Truncated</p>
        ) : null}
      </dd>
    </div>
  );
}
