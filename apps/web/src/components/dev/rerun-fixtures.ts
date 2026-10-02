import {
  RerunFingerprint,
  type RerunPlan,
} from "@sphynx/schema/domain/eval-rerun";
import type { EvalVariant } from "@sphynx/schema/domain/evals";

const variant = (
  id: string,
  harness: EvalVariant["harness"],
  model: string
): EvalVariant => ({
  harness,
  id,
  model,
  profile: null,
  sandbox: "e2b",
  userModel: null,
});

export const RERUN_PLAN: RerunPlan = {
  fingerprint: RerunFingerprint.make("3f9c1a2b7d4e5061"),
  skipped: [
    {
      caseId: "renames-a-column-safely",
      caseName: "renames a column safely",
      reason: "nothingFailed",
    },
    {
      caseId: "writes-a-changelog-entry",
      caseName: "writes a changelog entry",
      reason: "neverRun",
    },
    {
      caseId: "opens-a-draft-pull-request",
      caseName: "opens a draft pull request",
      reason: "onlyLocal",
    },
    {
      caseId: "backfills-a-nullable-column",
      caseName: "backfills a nullable column",
      reason: "overBatchLimit",
    },
  ],
  slots: [
    {
      caseId: "asks-before-it-pushes",
      caseName: "asks before it pushes",
      variant: {
        kind: "existing",
        variant: variant("evar_claude", "claude", "claude-opus-4-5"),
      },
    },
    {
      caseId: "asks-before-it-pushes",
      caseName: "asks before it pushes",
      variant: {
        kind: "existing",
        variant: variant("evar_codex", "codex", "gpt-5-codex"),
      },
    },
    {
      caseId: "reverts-a-bad-migration",
      caseName: "reverts a bad migration",
      variant: {
        kind: "existing",
        variant: variant("evar_claude_revert", "claude", "claude-opus-4-5"),
      },
    },
    {
      caseId: "reverts-a-bad-migration",
      caseName: "reverts a bad migration",
      variant: {
        harness: "gemini",
        kind: "fresh",
        model: "gemini-3-pro",
        sandbox: "e2b",
      },
    },
    {
      caseId: "keeps-the-lockfile-in-step",
      caseName: "keeps the lockfile in step",
      variant: {
        kind: "existing",
        variant: variant("evar_codex_lock", "codex", "gpt-5-codex"),
      },
    },
    {
      caseId: "explains-a-failing-check",
      caseName: "explains a failing check",
      variant: {
        harness: "gemini",
        kind: "fresh",
        model: "gemini-3-pro",
        sandbox: "e2b",
      },
    },
  ],
  suite: { id: "release-checks", name: "release checks" },
  trials: 2,
};
