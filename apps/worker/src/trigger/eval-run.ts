import { schemaTask } from "@trigger.dev/sdk";
import { Schema } from "effect";

/* Identifiers only: payloads are shown in the Trigger dashboard, so the worker resolves credentials itself. */
const EvalRunPayload = Schema.Struct({
  organizationId: Schema.String,
  runId: Schema.String,
});

type EvalRunPayload = typeof EvalRunPayload.Type;

const decode = Schema.decodeUnknownSync(EvalRunPayload);

export const evalRun = schemaTask({
  id: "eval-run",
  machine: "small-1x",
  maxDuration: 3600,
  schema: (payload: unknown) => decode(payload),
  /* Imported lazily: the eval stack costs over a second to import, paid by the first run rather than every cold start. */
  run: async (payload: EvalRunPayload) => {
    const { executeStoredRun } = await import("./execute-stored-run");

    return { cells: await executeStoredRun(payload) };
  },
});
