import type { ResolvedPrompt } from "@anpord/schema/domain/prompts";
import { useState } from "react";

/**
 * Editing the working copy, reading a past version, and correcting one in place
 * are three different acts, so a selection names which one rather than
 * overloading a nullable version number.
 */
type Selection =
  | { readonly kind: "draft" }
  | { readonly kind: "history"; readonly version: number }
  | { readonly kind: "correcting"; readonly version: number };

interface PromptSelection {
  /** What the editor holds, which is the draft while one is being written and
   * the viewed version otherwise. */
  readonly content: string;
  readonly correcting: boolean;
  /** Set while the content differs from what the selection is based on. */
  readonly dirty: boolean;
  readonly editing: boolean;
  readonly onCancelCorrection: () => void;
  readonly onCorrect: (version: number) => void;
  /** Opens a past version as a new draft rather than rewriting it. */
  readonly onEditFrom: (from: ResolvedPrompt) => void;
  readonly onType: (value: string) => void;
  readonly onView: (version: number) => void;
  /** Returns to the newest version with nothing pending, for once a write has
   * landed and the draft it came from is no longer the truth. */
  readonly reset: () => void;
  /** Trimmed, which is what a write should carry. */
  readonly submitted: string;
  readonly viewed: ResolvedPrompt;
}

/**
 * Which version the page is showing, and whether what is on screen is being
 * written, read, or rewritten. Held here so the route reads as the page it
 * renders rather than as the state machine behind it.
 */
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

  /** A correction rewrites the version being read; a draft continues from the
   * newest one. */
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
