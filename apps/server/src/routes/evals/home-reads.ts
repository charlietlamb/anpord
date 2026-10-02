import { EvalReads } from "@sphynx/eval/services/eval-reads";
import type { EvalHomeRange } from "@sphynx/schema/domain/eval-home";
import { Effect } from "effect";
import { organization } from "./current-organization";

export const readHome = (range: EvalHomeRange) =>
  Effect.gen(function* () {
    return yield* (yield* EvalReads).home({
      organizationId: yield* organization,
      range,
    });
  });
