import type { EvalDraft, EvalDraftCase } from "@anpord/schema/domain/evals";
import { EvalDraft as EvalDraftSchema } from "@anpord/schema/domain/evals";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { Schema } from "effect";
import { useRef } from "react";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/evals/variant-options";

/* The schema is the validator. Effect Schema implements Standard Schema, which
   is the interface TanStack Form checks for, so the contract the server
   decodes and the rules the form enforces are one definition rather than two
   that drift. */
const draftValidator = Schema.standardSchemaV1(EvalDraftSchema);

export const emptyCase = (): EvalDraftCase => ({
  goal: "",
  name: "",
  setup: null,
  source: { kind: "empty" },
  verify: null,
});

/** A new draft starts with one case open and the variant a run almost always
 * uses, because the first thing a person does is describe a task and the last
 * thing they want is to pick a model they were going to pick anyway. */
export const emptyDraft = (): EvalDraft => ({
  cases: [emptyCase()],
  models: [DEFAULT_MODEL],
  name: "",
  prompt: "{{goal}}",
  providers: [DEFAULT_PROVIDER],
  trials: 3,
});

/** Cases that will run and cannot pass. Mirrors `ungatedCasesIn` on the
 * server so the warning appears while the draft is being written rather than
 * after it is saved. */
export const ungatedIn = (cases: readonly EvalDraftCase[]) =>
  cases
    .filter(
      (subject) => subject.verify === null || subject.verify.trim() === ""
    )
    .map((subject) => (subject.name === "" ? "This case" : subject.name));

/**
 * A stable identity per row, for as long as the row exists.
 *
 * Keyed by index, removing a case hands a half-written row the values of the
 * one below it, because React reuses the input that was already there. The
 * key lives here rather than on the case because the server has no use for
 * one and the schema describes what is saved.
 */
export function useCaseKeys(count: number) {
  const keys = useRef<string[]>([]);
  const next = useRef(0);

  while (keys.current.length < count) {
    next.current += 1;
    keys.current.push(`case-${next.current}`);
  }

  if (keys.current.length > count) {
    keys.current = keys.current.slice(0, count);
  }

  return {
    at: (index: number) => keys.current[index] ?? `case-${index}`,
    forget: (index: number) => {
      keys.current = keys.current.filter((_, each) => each !== index);
    },
  };
}

export function useEvalForm({
  initial,
  onSubmit,
}: {
  readonly initial?: EvalDraft;
  readonly onSubmit: (draft: EvalDraft) => Promise<void>;
}) {
  return useAppForm({
    defaultValues: initial ?? emptyDraft(),
    onSubmit: ({ value }) => onSubmit(value),
    validators: { onChange: draftValidator },
  });
}
