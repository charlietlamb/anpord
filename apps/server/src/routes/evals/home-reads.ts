import { EvalReads } from "@anpord/eval/services/eval-reads";
import type { EvalHomeRange } from "@anpord/schema/domain/eval-home";
import { Effect } from "effect";
import { organization } from "./current-organization";

export const readHome = (range: EvalHomeRange) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).home({
      organizationId: yield* organization,
      range,
    });
  });
