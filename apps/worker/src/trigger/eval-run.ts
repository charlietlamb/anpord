import { schemaTask } from "@trigger.dev/sdk";
import { Schema } from "effect";

/* Identifiers only. Payloads are recorded and shown in the dashboard, so the
   worker resolves credentials itself from what the run already recorded. */
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
  /* The eval stack reaches a database pool, a sandbox SDK and a GitHub app,
     and importing it costs over a second. Imported here rather than at the top
     of the file, that second is paid by the first run to arrive instead of by
     every cold start, before Trigger knows whether a run is even coming. */
  run: async (payload: EvalRunPayload) => {
    const { executeStoredRun } = await import("./execute-stored-run");

    return { cells: await executeStoredRun(payload) };
  },
});
