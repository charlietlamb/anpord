import { afterAll, describe, expect, test } from "bun:test";
import { Database } from "@anpord/db/client";
import { Effect, Layer, ManagedRuntime } from "effect";
import { Batches } from "../../src/grid/batches";
import { AgentTrial } from "../../src/services/agent-trial";
import { EvalReads } from "../../src/services/eval-reads";
import { skipWithoutDatabase } from "../fixtures/database";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  type Dispatched,
  evalStack,
  requestOf,
  scriptedAgent,
  seedConnections,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const organizationId = `org_remote_${suffix}`;
const dispatched: Dispatched[] = [];

const dispatcher = ManagedRuntime.make(
  evalStack({
    agent: Layer.succeed(AgentTrial, {
      run: () => Effect.dieMessage("the dispatcher must not execute trials"),
    }),
    runner: capturingRunner(dispatched),
  })
);

const worker = ManagedRuntime.make(
  evalStack({ agent: scriptedAgent(), runner: capturingRunner([]) })
);

const sourceFiles = [
  { content: "export const validate = () => true;", path: "validate.ts" },
];

describe.skipIf(skipWithoutDatabase())("a batch handed to a worker", () => {
  afterAll(async () => {
    await dispatcher.dispose();
    await worker.dispose();
  });

  test("the dispatcher reads the worker's completion from storage", async () => {
    await dispatcher.runPromise(
      Database.pipe(
        Effect.flatMap((db) =>
          Effect.promise(async () => {
            await seedOrganization(db, organizationId);
            await seedConnections(db, organizationId);
          })
        )
      )
    );

    const started = await dispatcher.runPromise(
      Batches.pipe(
        Effect.flatMap((batches) =>
          batches.start(
            actorOf(organizationId),
            requestOf({
              cases: [
                caseOf("fixture", {
                  validator: {
                    name: "validate",
                    source: "module.exports = () => true",
                    sourceFiles,
                  },
                  verify: null,
                }),
              ],
              trials: 2,
            })
          )
        )
      )
    );

    const read = (runtime: typeof dispatcher | typeof worker) =>
      runtime.runPromise(
        EvalReads.pipe(
          Effect.flatMap((reads) => reads.batch(organizationId, started.id))
        )
      );

    const running = await read(dispatcher);
    expect(dispatched.map((entry) => entry.batchId)).toEqual([started.id]);
    expect(running.status).toBe("running");
    expect(running.runs[0]?.status).toBe("running");
    expect(running.runs[0]?.trials).toEqual([]);
    expect(running.runs[0]?.setup.validator).toBe("validate");
    expect(running.runs[0]?.setup.validatorFiles).toEqual(sourceFiles);

    const executed = await worker.runPromise(
      Batches.pipe(Effect.flatMap((batches) => batches.execute(started.id)))
    );
    expect(executed).toBe(1);

    const finished = await read(dispatcher);
    expect(finished.status).toBe("finished");
    expect(finished.runs[0]?.status).toBe("finished");
    expect(finished.runs[0]?.trials.map((trial) => trial.status)).toEqual([
      "passed",
      "passed",
    ]);

    const page = await dispatcher.runPromise(
      EvalReads.pipe(
        Effect.flatMap((reads) =>
          reads.batches({ cursor: null, limit: 1, organizationId })
        )
      )
    );
    expect(page.total).toBe(1);
    expect(page.batches[0]).toMatchObject({
      id: started.id,
      passed: 2,
      status: "finished",
    });
  });
});
