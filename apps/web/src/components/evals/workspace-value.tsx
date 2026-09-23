import type { EvalCaseWorkspace } from "@anpord/schema/domain/evals";
import { InlineCode } from "@anpord/ui/components/ui/inline-code";
import { EmptyValue } from "@/components/evals/empty-value";

export function WorkspaceValue({
  workspace,
}: {
  readonly workspace: EvalCaseWorkspace;
}) {
  switch (workspace.kind) {
    case "repo":
      return (
        <InlineCode>
          {workspace.ref === null
            ? workspace.url
            : `${workspace.url}@${workspace.ref}`}
        </InlineCode>
      );
    case "files":
      return (
        <span className="flex flex-wrap gap-1.5">
          {workspace.paths.map((path) => (
            <InlineCode key={path}>{path}</InlineCode>
          ))}
        </span>
      );
    default:
      return <EmptyValue>An empty directory</EmptyValue>;
  }
}
