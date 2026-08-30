import type { EvalSource } from "@anpord/schema/domain/evals";
import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";

export const repo = (spec: string): EvalSource => {
  const parsed = parseRepo(spec);

  if (parsed === null) {
    throw new TypeError(
      `Could not read "${spec}" as a repository. Write it as owner/repo, owner/repo@ref, or a clone url.`
    );
  }

  return { kind: "repo", ref: parsed.ref, url: cloneUrlOf(parsed) };
};

export const files = (
  contents: Readonly<Record<string, string>>
): EvalSource => ({ files: contents, kind: "files" });

export const empty: EvalSource = { kind: "empty" };
