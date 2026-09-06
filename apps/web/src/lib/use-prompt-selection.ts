import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useState } from "react";

type Selection =
  | { readonly kind: "draft" }
  | { readonly kind: "history"; readonly version: number }
  | { readonly kind: "correcting"; readonly version: number };

interface PromptSelection {
  readonly content: string;
  readonly correcting: boolean;
  readonly dirty: boolean;
  readonly editing: boolean;
  readonly onCancelCorrection: () => void;
  readonly onCorrect: (version: number) => void;
  readonly onEditFrom: (from: ResolvedPrompt) => void;
  readonly onType: (value: string) => void;
  readonly onView: (version: number) => void;
  readonly reset: () => void;
  readonly submitted: string;
  readonly viewed: ResolvedPrompt;
}

export function usePromptSelection(
  versions: readonly ResolvedPrompt[],
  latest: ResolvedPrompt
): PromptSelection {
  const [draft, setDraft] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "draft" });

  const correcting = selection.kind === "correcting";
  const editing = selection.kind === "draft" || correcting;
  const viewed =
    selection.kind === "draft"
      ? latest
      : (versions.find((row) => row.version === selection.version) ?? latest);

  /* A correction rewrites the version being read; a draft continues from the newest. */
  const base = correcting ? viewed : latest;
  const content = editing ? (draft ?? base.content) : viewed.content;
  const submitted = content.trim();

  return {
    content,
    correcting,
    dirty: editing && submitted !== base.content.trim(),
    editing,
    onCancelCorrection: () => {
      setDraft(null);
      setSelection({ kind: "history", version: viewed.version });
    },
    onCorrect: (version) => setSelection({ kind: "correcting", version }),
    onEditFrom: (from) => {
      setDraft(from.content);
      setSelection({ kind: "draft" });
    },
    onType: setDraft,
    onView: (version) => setSelection({ kind: "history", version }),
    reset: () => {
      setDraft(null);
      setSelection({ kind: "draft" });
    },
    submitted,
    viewed,
  };
}
