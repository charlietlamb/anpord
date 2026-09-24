import type { EvalSetup } from "@anpord/schema/domain/evals";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { EmptyValue } from "@/components/evals/empty-value";

export function ChecksValue({ setup }: { readonly setup: EvalSetup }) {
  if (setup.verify !== null) {
    return <CodeBlock copyValue={setup.verify}>{setup.verify}</CodeBlock>;
  }

  if (setup.validator === null) {
    return <EmptyValue>Nothing checks this case</EmptyValue>;
  }

  return (
    <span className="flex items-center gap-2">
      <CheckCircleIcon
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <span className="truncate">{setup.validator}</span>
    </span>
  );
}
