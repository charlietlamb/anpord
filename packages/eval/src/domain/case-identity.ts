import { createHash } from "node:crypto";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import type { EvalValidator } from "@anpord/schema/domain/evals";
import type { WorkspaceSource } from "./workspace-source";

export interface CaseDefinition {
  readonly name: string;
  readonly prepare: { readonly source: string } | null;
  readonly source: WorkspaceSource;
  readonly user?: EvalUser | null;
  readonly validator?: EvalValidator | null;
  readonly variables: Readonly<Record<string, string>>;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

const variablesOf = (variables: Readonly<Record<string, string>>) =>
  Object.keys(variables)
    .sort()
    .map((key) => `${key}=${variables[key]}`)
    .join("\u0000");

const validatorOf = (validator: EvalValidator | null | undefined) => {
  if (validator == null) {
    return "";
  }
  if ("source" in validator) {
    return validator.source;
  }
  const { sourceFiles, ...execution } = validator;
  return JSON.stringify(execution);
};

/* Last, and empty when absent, so a case that states no human keeps the
   identity it had before one could. */
const userOf = (user: EvalUser | null | undefined) =>
  user == null ? "" : JSON.stringify(user);

const sourceOf = (source: WorkspaceSource) => {
  if (source.kind === "empty") {
    return "empty";
  }

  if (source.kind === "repo") {
    return `repo ${source.url} ${source.ref ?? ""}`;
  }

  /* Sorted: the same fixtures in a different order are the same case. */
  return `files ${Object.entries(source.files)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path} ${content}`)
    .join("")}`;
};

export const definitionHashOf = (input: CaseDefinition): string =>
  createHash("sha256")
    .update(
      [
        variablesOf(input.variables),
        input.prepare?.source ?? "",
        validatorOf(input.validator),
        input.verifyCommand ?? "",
        input.workspace,
        sourceOf(input.source),
        userOf(input.user),
      ].join(" ")
    )
    .digest("hex")
    .slice(0, 32);
