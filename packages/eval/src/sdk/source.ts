import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";
import { Effect } from "effect";
import { UnreadableSource } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";

/**
 * A repository, named the way a person says it.
 *
 * `repo("acme/widgets@a1b2c3d")` rather than a kind, a url, and a ref, which
 * were three fields that had to agree and one of which was a nullable string
 * nobody could see the shape of. The ref travels with the name it belongs to.
 */
export const repo = (spec: string): SourceSpec => ({ kind: "repo", spec });

/** Files written into an empty workspace, for a case with no repository. */
export const files = (
  contents: Readonly<Record<string, string>>
): SourceSpec => ({ contents, kind: "files" });

/** Nothing. The agent starts in an empty directory. */
export const empty: SourceSpec = { kind: "empty" };

export type SourceSpec =
  | {
      readonly contents: Readonly<Record<string, string>>;
      readonly kind: "files";
    }
  | { readonly kind: "empty" }
  | { readonly kind: "repo"; readonly spec: string };

/**
 * Reads a declared source into the one the runner clones.
 *
 * Fails rather than returning null so a mistyped repository is reported by the
 * same validation that reports a mistyped harness, before a sandbox opens.
 */
/**
 * Reads every case's source, or fails before a sandbox opens.
 *
 * Validated rather than short-circuited, so a file with three typos reports
 * three -- the same bargain resolveVariants makes for harnesses.
 */
export const resolveSources = <A extends { readonly source: SourceSpec }>(
  subjects: readonly A[]
) =>
  Effect.validateAll(subjects, (subject) =>
    resolveSource(subject.source).pipe(
      Effect.map((source) => ({ ...subject, source }))
    )
  ).pipe(Effect.withSpan("Eval.resolveSources"));

export const resolveSource = (
  source: SourceSpec
): Effect.Effect<WorkspaceSource, UnreadableSource> => {
  if (source.kind === "empty") {
    return Effect.succeed({ kind: "empty" });
  }

  if (source.kind === "files") {
    return Effect.succeed({ files: source.contents, kind: "files" });
  }

  const parsed = parseRepo(source.spec);

  return parsed === null
    ? Effect.fail(new UnreadableSource({ spec: source.spec }))
    : Effect.succeed({
        kind: "repo",
        ref: parsed.ref,
        url: cloneUrlOf(parsed),
      });
};
