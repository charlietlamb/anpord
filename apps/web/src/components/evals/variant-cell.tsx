import { Badge } from "@anpord/ui/components/ui/badge";
import { VariantName } from "@/components/evals/variant-name";

export function VariantCell({
  harness,
  model,
}: {
  readonly harness: string;
  readonly model: string;
}) {
  return (
    <Badge className="min-w-0 max-w-full" size="sm" variant="secondary">
      <VariantName harness={harness} model={model} />
    </Badge>
  );
}
