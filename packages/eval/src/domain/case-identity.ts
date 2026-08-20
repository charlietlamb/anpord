import { createHash } from "node:crypto";
import type { WorkspaceSource } from "../services/workspace";

export interface CaseDefinition {
  readonly name: string;
  readonly prompt: string;
  readonly setupCommand: string | null;
  readonly source: WorkspaceSource;
  readonly verifyCommand: string;
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
 * Content addressed rather than named, because a name is a label a person
 * edits. Change the goal or the verifier and it is a different case, which
 * earns a new identity and keeps the old one comparable to its own past.
 */
export const caseIdentityOf = (input: CaseDefinition): string =>
  createHash("sha256")
    .update(
      [
        input.name,
        input.prompt,
        input.setupCommand ?? "",
        input.verifyCommand,
        input.workspace,
        sourceOf(input.source),
      ].join(" ")
    )
    .digest("hex")
    .slice(0, 32);
