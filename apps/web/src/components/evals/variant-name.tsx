import type { EvalTask } from "@anpord/schema/domain/evals";
import {
  HarnessLabel,
  ModelLabel,
  SandboxLabel,
} from "@/components/evals/variant-label";

/**
 * A variant read aloud: the model, the harness that drove it, the sandbox it
 * ran in.
 *
 * The harness is named rather than only marked, because Codex's mark is the
 * OpenAI mark and beside a GPT model it vanished: a row read as a model on a
 * sandbox with nothing in between. The version lives in the rail; a row is
 * scanned, not read. The profile stays, because it is the difference between
 * two rows that otherwise read the same.
 */
export function VariantName({ task }: { readonly task: EvalTask }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ModelLabel model={task.model} />
      <span className="text-muted-foreground">in</span>
      <HarnessLabel harness={task.harness} profile={task.profile} />
      <span className="text-muted-foreground">on</span>
      <SandboxLabel provider={task.provider} />
    </span>
  );
}
