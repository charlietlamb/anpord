import type { EvalSource } from "@anpord/schema/domain/evals";
import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";

/**
 * A repository, named the way a person says it.
 *
 * `repo("acme/widgets@a1b2c3d")` rather than a kind, a url, and a ref: three
 * fields that had to agree, one of them a nullable string whose shape nobody
 * could see. The ref travels with the name it belongs to.
 *
 * A private repository clones when the organisation's GitHub app is installed
 * on it; nothing else needs configuring.
 */
export const repo = (spec: string): EvalSource => {
  const parsed = parseRepo(spec);

  if (parsed === null) {
    throw new TypeError(
      `Could not read "${spec}" as a repository. Write it as owner/repo, owner/repo@ref, or a clone url.`
    );
  }

  return { kind: "repo", ref: parsed.ref, url: cloneUrlOf(parsed) };
};

/** Files written into an empty workspace, for a case with no repository. */
export const files = (
  contents: Readonly<Record<string, string>>
): EvalSource => ({ files: contents, kind: "files" });

/** Nothing. The agent starts in an empty directory. */
export const empty: EvalSource = { kind: "empty" };
