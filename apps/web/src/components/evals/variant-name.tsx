import { harnessPresentation } from "@/lib/evals/variant-presentation";

const UNNAMED = "none";

export function VariantName({
  harness,
  model,
}: {
  readonly harness: string;
  readonly model: string;
}) {
  const { Icon, label } = harnessPresentation(harness);

  return (
    <>
      <Icon aria-hidden="true" />
      <span className="shrink-0 text-muted-foreground">{label}</span>
      {model === UNNAMED || model === "" ? null : (
        <span className="truncate">{model}</span>
      )}
    </>
  );
}
