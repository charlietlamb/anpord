import { CopyButton } from "@anpord/ui/components/copy-button";
import { CodeContent } from "@anpord/ui/components/ui/code-card";
import type { CodeLanguage } from "@anpord/ui/lib/highlight";

const formatValue = (value: string): { code: string; lang: CodeLanguage } => {
  try {
    const parsed: unknown = JSON.parse(value);
    return { code: JSON.stringify(parsed, null, 2), lang: "json" };
  } catch {
    return { code: value || "(empty)", lang: "text" };
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
      <dt className="flex items-center justify-between px-3.5 pt-2 text-muted-foreground text-xs">
        {label}
        {value === undefined ? null : (
          <CopyButton
            className="size-6"
            label={`Copy ${label}`}
            value={value}
          />
        )}
      </dt>
      <dd>
        {value === undefined ? (
          <p className="px-3.5 py-2.5 text-muted-foreground text-xs">
            Not recorded
          </p>
        ) : (
          <CodeContent {...formatValue(value)} maxHeight="max-h-64" />
        )}
        {truncated ? (
          <p className="px-3.5 pb-2 text-warning text-xs">Truncated</p>
        ) : null}
      </dd>
    </div>
  );
}
