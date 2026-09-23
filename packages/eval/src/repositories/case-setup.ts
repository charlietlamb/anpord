import type {
  EvalCaseSetup,
  EvalCaseWorkspace,
  EvalValidator,
} from "@anpord/schema/domain/evals";
import type { WorkspaceSource } from "../domain/workspace-source";
import { caseFrom } from "../grid/from-stored";
import type { CellTask } from "./run-tasks-query";

type CodeValidator = Extract<EvalValidator, { readonly source: string }>;

const namesOf = (validator: Pick<CodeValidator, "manifest" | "name">) =>
  validator.manifest?.map((check) => check.name) ?? [validator.name];

const checksOf = (validator: EvalValidator | null | undefined) => {
  if (validator == null) {
    return [];
  }

  return "kind" in validator && validator.kind === "judged"
    ? [...validator.checks.flatMap(namesOf), validator.name]
    : namesOf(validator);
};

const workspaceOf = (source: WorkspaceSource): EvalCaseWorkspace => {
  switch (source.kind) {
    case "files":
      return { kind: "files", paths: Object.keys(source.files).sort() };
    case "repo":
      return { kind: "repo", ref: source.ref, url: source.url };
    default:
      return { kind: "empty" };
  }
};

export const setupOf = (task: CellTask): EvalCaseSetup => {
  const subject = caseFrom(task);

  return {
    checks: checksOf(subject.validator),
    prepare: subject.prepare?.name ?? null,
    prompt: task.prompt,
    verify: subject.verify,
    workspace: workspaceOf(subject.source),
  };
};
