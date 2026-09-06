import assert from "node:assert/strict";
import { Effect, Schedule } from "effect";
import { z } from "zod";
import { api, endpoint, withApi } from "../../../dist/api.mjs";

let started;
const ready = new Promise((resolve) => {
  started = resolve;
});
let aborted = false;

await assert.rejects(
  withApi({
    api: api({
      name: "cancel",
      endpoints: [
        endpoint({
          method: "GET",
          path: "/",
          inputSchema: z.object({}),
          responses: { 200: z.null() },
          handler: (_, { signal }) =>
            new Promise((_, reject) => {
              signal.addEventListener("abort", () => {
                aborted = true;
                reject(new Error("cancelled"));
              });
              started();
            }),
        }),
      ],
    }),
    run: async ({ url, calls }) => {
      const controller = new AbortController();
      const request = fetch(url, { signal: controller.signal });
      await ready;
      controller.abort();
      await assert.rejects(request);
      await Effect.tryPromise(calls).pipe(
        Effect.repeat({
          until: (values) => values.length > 0,
          schedule: Schedule.spaced("5 millis"),
        }),
        Effect.timeout("2 seconds"),
        Effect.runPromise
      );
      const recorded = await calls();
      assert.equal(recorded[0]?.status, 499);
      assert.equal(recorded[0]?.error, "Request cancelled");
      assert.equal(aborted, true);
    },
  }),
  /An API endpoint failed/
);
