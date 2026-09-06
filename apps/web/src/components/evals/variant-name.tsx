import type { EvalTask } from "@anpord/schema/domain/evals";
import {
  HarnessLabel,
  ModelLabel,
  SandboxLabel,
} from "@/components/evals/variant-label";

/* The harness is named, not just marked: Codex's mark is OpenAI's and vanishes beside a GPT model. */
export function VariantName({ task }: { readonly task: EvalTask }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ModelLabel model={task.model} />
      <span className="text-muted-foreground">in</span>
      <HarnessLabel harness={task.harness} profile={task.profile} />
      <span className="text-muted-foreground">on</span>
      <SandboxLabel sandbox={task.sandbox} />
    </span>
  );
}
