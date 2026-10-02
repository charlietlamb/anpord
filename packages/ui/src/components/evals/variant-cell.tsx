import { VariantName } from "@sphynx/ui/components/evals/variant-name";
import { Badge } from "@sphynx/ui/components/ui/badge";

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
