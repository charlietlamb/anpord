import {
  EVAL_RUN,
  EvalBatchPayload,
} from "@anpord/eval/adapters/runner/eval-run-task";
import { schemaTask } from "@trigger.dev/sdk";
import { Schema } from "effect";

const decode = Schema.decodeUnknownSync(EvalBatchPayload);

export const evalRun = schemaTask({
  id: EVAL_RUN,
  machine: "small-1x",
  maxDuration: 3600,
  schema: (payload: unknown) => decode(payload),
  run: async (payload: EvalBatchPayload) => {
    const { executeBatch } = await import("./execute-batch");

    return { runs: await executeBatch(payload) };
  },
});
