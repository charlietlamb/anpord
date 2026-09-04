import { EvalHarness, EvalProvider } from "@anpord/schema/domain/evals";
import { Option, Schema } from "effect";
import type { HarnessName, ProviderName } from "./cell";

const harness = Schema.decodeUnknownOption(EvalHarness);
const provider = Schema.decodeUnknownOption(EvalProvider);

/**
 * A cell's harness and provider, read back from the text columns that hold
 * them.
 *
 * Decoded rather than asserted: the columns are plain text with no check
 * constraint, so a row written by an older deploy names a harness this build
 * has no driver for. Casting made that a crash at resolve time; an `Option`
 * makes it a cell the caller can skip.
 */
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
