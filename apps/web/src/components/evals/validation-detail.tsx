import type { EvalValidation } from "@anpord/schema/domain/eval-validations";
import { PageTabs } from "@anpord/ui/components/ui/page-tabs";
import {
  BracketsCurlyIcon,
  ListMagnifyingGlassIcon,
  SignInIcon,
} from "@phosphor-icons/react";
import { useState } from "react";
import { ReadEvidence } from "@/components/evals/read-evidence";
import { ValidationExecution } from "@/components/evals/validation-execution";
import { ValidationResult } from "@/components/evals/validation-result";

type Pane = "result" | "evidence" | "execution";

const PANES = [
  { Icon: BracketsCurlyIcon, label: "Result", value: "result" },
  { Icon: ListMagnifyingGlassIcon, label: "Evidence", value: "evidence" },
  { Icon: SignInIcon, label: "Execution", value: "execution" },
] as const;

export function ValidationDetail({
  validation,
}: {
  readonly validation: EvalValidation;
}) {
  const [pane, setPane] = useState<Pane>("result");

  return (
    <div className="flex flex-col gap-3">
      <PageTabs onChange={setPane} options={PANES} value={pane} />

      {pane === "result" ? <ValidationResult validation={validation} /> : null}

      {pane === "evidence" ? (
        <div className="min-w-0">
          <ReadEvidence validation={validation} />
        </div>
      ) : null}

      {pane === "execution" ? (
        <ValidationExecution validation={validation} />
      ) : null}

      {validation.truncated ? (
        <p className="text-warning text-xs">Some evidence was truncated.</p>
      ) : null}
    </div>
  );
}
