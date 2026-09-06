import type { EvalSource } from "@anpord/schema/domain/evals";
import { Segmented } from "@anpord/ui/components/ui/segmented";
import { useQuery } from "@tanstack/react-query";
import { RepositoryField } from "@/components/evals/repository-field";
import { codebaseQueries } from "@/lib/codebase-queries";

const EMPTY_HINT =
  "The agent starts in an empty directory. Good for a task that writes something from scratch.";

const REPO_HINT =
  "Cloned before the agent starts, so the task runs against real code.";

/* The API also accepts inline files, which this form deliberately does not offer; a case carrying them keeps them until the source is changed. */
const isRepo = (source: EvalSource) => source.kind === "repo";

const SOURCES: readonly {
  readonly label: string;
  readonly value: "empty" | "repo";
}[] = [
  { label: "Empty", value: "empty" },
  { label: "Git repository", value: "repo" },
];

export function WorkspaceField({
  onChange,
  value,
}: {
  readonly onChange: (next: EvalSource) => void;
  readonly value: EvalSource;
}) {
  const repo = isRepo(value);
  const account = useQuery(codebaseQueries.account());
  const repositories = useQuery(
    codebaseQueries.repositories(account.data != null)
  );

  return (
    <div className="grid gap-1.5">
      <span className="font-medium text-xs">Workspace</span>

      <Segmented
        onChange={(kind) =>
          onChange(
            kind === "empty"
              ? { kind: "empty" }
              : { kind: "repo", ref: null, url: "" }
          )
        }
        options={SOURCES}
        value={repo ? "repo" : "empty"}
      />

      {value.kind === "repo" ? (
        <RepositoryField
          onChange={onChange}
          repositories={repositories.data ?? []}
          value={value}
        />
      ) : null}

      <p className="text-muted-foreground text-xs">
        {repo ? REPO_HINT : EMPTY_HINT}
      </p>
    </div>
  );
}
