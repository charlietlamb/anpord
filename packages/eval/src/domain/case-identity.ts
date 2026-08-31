import { createHash } from "node:crypto";
import type { EvalValidator } from "@anpord/schema/domain/evals";
import type { WorkspaceSource } from "./workspace-source";

export interface CaseDefinition {
  readonly name: string;
  readonly prepare: { readonly source: string } | null;
  readonly source: WorkspaceSource;
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

/** Content addressed, so the same case resolves to the same row and a
 * baseline survives across runs. */
export const caseIdentityOf = (input: CaseDefinition): string =>
  createHash("sha256")
    .update(
      [
        variablesOf(input.variables),
        input.prepare?.source ?? "",
        input.validator?.source ?? "",
        input.verifyCommand ?? "",
        input.workspace,
        sourceOf(input.source),
      ].join(" ")
    )
    .digest("hex")
    .slice(0, 32);
