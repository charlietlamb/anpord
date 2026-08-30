import { cloneUrlOf, parseRepo } from "@anpord/schema/domain/repo-spec";
import { Effect } from "effect";
import { UnreadableSource } from "../domain/errors";
import type { WorkspaceSource } from "../domain/workspace-source";

export type SourceSpec =
  | {
      readonly contents: Readonly<Record<string, string>>;
      readonly kind: "files";
    }
  | { readonly kind: "empty" }
  | { readonly kind: "repo"; readonly spec: string };

export const repo = (spec: string): SourceSpec => ({ kind: "repo", spec });

export const files = (
  contents: Readonly<Record<string, string>>
): SourceSpec => ({ contents, kind: "files" });

export const empty: SourceSpec = { kind: "empty" };

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

export const resolveSources = <A extends { readonly source: SourceSpec }>(
  subjects: readonly A[]
) =>
  Effect.validateAll(subjects, (subject) =>
    resolveSource(subject.source).pipe(
      Effect.map((source) => ({ ...subject, source }))
    )
  ).pipe(Effect.withSpan("Eval.resolveSources"));
