import type { EvalCaseSetup } from "@anpord/schema/domain/evals";
import { CodeBlock } from "@anpord/ui/components/ui/code-block";
import { CheckCircleIcon } from "@phosphor-icons/react";
import { EmptyValue } from "@/components/evals/empty-value";

export function ChecksValue({ setup }: { readonly setup: EvalCaseSetup }) {
  if (setup.verify !== null) {
    return <CodeBlock copyValue={setup.verify}>{setup.verify}</CodeBlock>;
  }

  if (setup.checks.length === 0) {
    return <EmptyValue>Nothing checks this case</EmptyValue>;
  }

  return (
    <ul className="flex flex-col gap-1">
      {setup.checks.map((check) => (
        <li className="flex items-center gap-2" key={check}>
          <CheckCircleIcon
            aria-hidden="true"
            className="size-3.5 shrink-0 text-muted-foreground"
          />
          <span className="truncate">{check}</span>
        </li>
      ))}
    </ul>
  );
}
