import type { EvalTrial } from "@anpord/schema/domain/evals";
import { ShellBlock } from "@anpord/ui/components/ui/shell-block";

export function CommandsHint({ trial }: { readonly trial: EvalTrial }) {
  const failed = trial.trajectory.filter(
    (entry) => entry._tag === "command" && (entry.exitCode ?? 0) !== 0
  );

  if (failed.length === 0) {
    return "Shell commands the agent ran in the sandbox.";
  }

  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-pretty">
        An agent probing a repository hits a non-zero exit and recovers, so a
        passed trial can still have them.
      </span>

      {failed.map((entry) =>
        entry._tag === "command" ? (
          <span className="flex flex-col gap-1" key={entry.command}>
            <ShellBlock
              className="max-h-32"
              command={entry.command}
              copyable={false}
              tone="inverted"
            />
            <span className="text-xs opacity-70">exit {entry.exitCode}</span>
          </span>
        ) : null
      )}
    </span>
  );
}
