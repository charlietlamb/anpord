import { Badge } from "@anpord/ui/components/ui/badge";
import { harnessPresentation } from "@/lib/evals/variant-presentation";

const UNNAMED = "none";

export function VariantCell({
  harness,
  model,
}: {
  readonly harness: string;
  readonly model: string;
}) {
  const { Icon, label } = harnessPresentation(harness);

  return (
    <Badge className="min-w-0 max-w-full" size="sm" variant="secondary">
      <Icon aria-hidden="true" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {model === UNNAMED || model === "" ? null : (
        <span className="truncate">{model}</span>
      )}
    </Badge>
  );
}
