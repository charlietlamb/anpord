import { HarnessVersions } from "@anpord/eval/services/harness-versions";
import type { EvalHarness } from "@anpord/schema/domain/evals";
import { Effect } from "effect";

export const harnessVersion = (harness: EvalHarness) =>
  HarnessVersions.pipe(
    Effect.flatMap((versions) => versions.version(harness)),
    Effect.withSpan("EvalHarness.version", { attributes: { harness } })
  );
