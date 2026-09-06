import { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import type { HarnessName, ProviderName } from "./cell";

const harness = Schema.decodeUnknownOption(EvalHarness);
const provider = Schema.decodeUnknownOption(EvalProvider);

/* Decoded, not asserted: the columns are plain text, so an older deploy's row may
   name a harness this build has no driver for. */
export const namesOf = (row: {
  readonly harness: string;
  readonly provider: string;
}): Option.Option<{
  readonly harness: HarnessName;
  readonly provider: ProviderName;
}> =>
  Option.all({
    harness: harness(row.harness),
    provider: provider(row.provider),
  });
