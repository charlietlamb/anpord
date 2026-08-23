import type { EvalDraft, EvalDraftCase } from "@anpord/schema/domain/evals";
import { EvalDraft as EvalDraftSchema } from "@anpord/schema/domain/evals";
import { useAppForm } from "@anpord/ui/hooks/use-app-form";
import { Schema } from "effect";
import { useId, useRef, useState } from "react";
import { DEFAULT_HARNESS, DEFAULT_PROVIDER } from "@/lib/evals/variant-options";

const draftValidator = Schema.standardSchemaV1(EvalDraftSchema);

export const emptyCase = (): EvalDraftCase => ({
  goal: "",
  name: "",
  setup: null,
  source: { kind: "empty" },
  verify: null,
});

const emptyDraft = (defaultModel: string | null): EvalDraft => ({
  agents:
    defaultModel === null
      ? []
      : [{ harness: DEFAULT_HARNESS, model: defaultModel }],
  cases: [emptyCase()],
  connections: {},
  name: "",
  prompt: "{{goal}}",
  providers: [DEFAULT_PROVIDER],
  trials: 3,
});

export const ungatedIn = (cases: readonly EvalDraftCase[]) =>
  cases.flatMap((subject) =>
    subject.verify === null || subject.verify.trim() === ""
      ? [subject.name === "" ? "This case" : subject.name]
      : []
  );

export function useCaseKeys(count: number) {
  const prefix = useId();
  const next = useRef(count);
  const [keys, setKeys] = useState(() =>
    Array.from({ length: count }, (_, index) => `${prefix}-${index}`)
  );

  return {
    add: () => {
      next.current += 1;
      setKeys((current) => [...current, `${prefix}-${next.current}`]);
    },
    at: (index: number) => keys[index] ?? `${prefix}-${index}`,
    forget: (index: number) => {
      setKeys((current) => current.filter((_, each) => each !== index));
    },
  };
}

export function useEvalForm({
  defaultModel,
  initial,
  onSubmit,
}: {
  readonly defaultModel: string | null;
  readonly initial?: EvalDraft;
  readonly onSubmit: (draft: EvalDraft) => Promise<void>;
}) {
  return useAppForm({
    defaultValues: initial ?? emptyDraft(defaultModel),
    onSubmit: ({ value }) => onSubmit(value),
    validators: { onChange: draftValidator },
  });
}
