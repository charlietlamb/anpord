import { schemaTask } from "@trigger.dev/sdk";
import { Schema } from "effect";

const EvalBatchPayload = Schema.Struct({
  batchId: Schema.String,
  organizationId: Schema.String,
});

type EvalBatchPayload = typeof EvalBatchPayload.Type;

const decode = Schema.decodeUnknownSync(EvalBatchPayload);

export const evalRun = schemaTask({
  id: "eval-run",
  machine: "small-1x",
  maxDuration: 3600,
  schema: (payload: unknown) => decode(payload),
  run: async (payload: EvalBatchPayload) => {
    const { executeBatch } = await import("./execute-batch");

    return { runs: await executeBatch(payload) };
  },
});
