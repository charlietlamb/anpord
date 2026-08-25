import type { EvalSource } from "@anpord/schema/domain/evals";
import { Button } from "@anpord/ui/components/button";
import { Input } from "@anpord/ui/components/input";
import { cn } from "@anpord/ui/lib/utils";

/* A repo the agent never had is the commonest reason an eval says nothing:
   the task was real and the workspace was bare. */
const EMPTY_HINT =
  "The agent starts in an empty directory. Good for a task that writes something from scratch.";

const REPO_HINT =
  "Cloned before the agent starts, so the task runs against real code.";

/* A source may also be a set of inline files, which the API accepts and this
   form does not offer: it is for a caller assembling a workspace in code, and
   a text box per file is a worse editor than the one they already have. A
   case that arrives carrying files keeps them -- this shows the empty state
   and only overwrites the source when someone picks a different one. */
const isRepo = (source: EvalSource) => source.kind === "repo";

export function WorkspaceField({
  onChange,
  value,
}: {
  readonly onChange: (next: EvalSource) => void;
  readonly value: EvalSource;
}) {
  const repo = isRepo(value);

  return (
    <div className="grid gap-1.5">
      <span className="font-medium text-xs">Workspace</span>

      <div className="flex w-fit gap-1 rounded-md border border-border-faint p-0.5">
        {[
          { label: "Empty", selected: !repo },
          { label: "Git repository", selected: repo },
        ].map((option) => (
          <Button
            className={cn(
              "h-7 px-2.5 text-xs",
              option.selected && "bg-alpha-8 text-foreground"
            )}
            key={option.label}
            onClick={() =>
              onChange(
                option.label === "Empty"
                  ? { kind: "empty" }
                  : { kind: "repo", ref: null, url: "" }
              )
            }
            size="sm"
            type="button"
            variant="ghost"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {value.kind === "repo" ? (
        <div className="grid gap-1.5 sm:grid-cols-[2fr_1fr]">
          <Input
            aria-label="Repository URL"
            onChange={(event) =>
              onChange({ ...value, url: event.target.value })
            }
            placeholder="https://github.com/owner/repo"
            value={value.url}
          />

          <Input
            aria-label="Branch, tag, or commit"
            onChange={(event) =>
              onChange({
                ...value,
                ref: event.target.value === "" ? null : event.target.value,
              })
            }
            placeholder="main"
            value={value.ref ?? ""}
          />
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {repo ? REPO_HINT : EMPTY_HINT}
      </p>
    </div>
  );
}
