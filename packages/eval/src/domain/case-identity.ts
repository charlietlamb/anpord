import { createHash } from "node:crypto";
import type { WorkspaceSource } from "../services/workspace";

export interface CaseDefinition {
  readonly goal: string;
  readonly name: string;
  readonly setupCommand: string | null;
  readonly source: WorkspaceSource;
  readonly verifyCommand: string | null;
  readonly workspace: string;
}

const sourceOf = (source: WorkspaceSource) => {
  if (source.kind === "empty") {
    return "empty";
  }

  if (source.kind === "repo") {
    return `repo ${source.url} ${source.ref ?? ""}`;
  }

  /* Sorted, because two identical fixtures written in a different order are
     the same case and must not read as two. */
  return `files ${Object.entries(source.files)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([path, content]) => `${path} ${content}`)
    .join("")}`;
};

/**
 * The identity of a case, from what the case actually is.
 *
 * A run used to insert a fresh task row every time, so the cell key hashed
 * over it was new on every run and no baseline promoted from one run could
 * ever match the next. Comparison across time was impossible, which is the
 * one thing every company in the research lacks and the reason this exists.
 *
 * Content addressed rather than named. A name is a label somebody edits,
 * and hashing it severed a case from every baseline promoted against it the
 * moment it was renamed. Change the goal or the verifier and it is a
 * different case, which earns a new identity and keeps the old one
 * comparable to its own past.
 *
 * The prompt is deliberately absent. It is the thing under test, like the
 * model and the harness, not part of what is being asked: hashing it made
 * every prompt edit a new case, so the one question every customer has,
 * "I changed my prompt, did the agent get worse", could never be answered.
 */
export const caseIdentityOf = (input: CaseDefinition): string =>
  createHash("sha256")
    .update(
      [
        input.goal,
        input.setupCommand ?? "",
        input.verifyCommand ?? "",
        input.workspace,
        sourceOf(input.source),
      ].join(" ")
    )
    .digest("hex")
    .slice(0, 32);
