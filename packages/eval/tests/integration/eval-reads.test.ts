import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { Database } from "@anpord/db/client";
import type { StartBatchRequest } from "@anpord/schema/domain/eval-definition";
import type { EvalTailMark } from "@anpord/schema/domain/eval-tail";
import type { EvalCasePage, EvalPageCursor } from "@anpord/schema/domain/evals";
import { Cause, Effect, Exit, ManagedRuntime, Option } from "effect";
import { Batches } from "../../src/grid/batches";
import { EvalReads } from "../../src/services/eval-reads";
import { skipWithoutDatabase } from "../fixtures/database";
import { seedOrganization } from "../fixtures/eval-rows";
import {
  actorOf,
  capturingRunner,
  caseOf,
  evalStack,
  FAILING,
  requestOf,
  scriptedAgent,
  seedConnections,
  variantOf,
} from "../fixtures/eval-stack";

const suffix = Date.now();
const organizationId = `org_reads_${suffix}`;
const actor = actorOf(organizationId);

const runtime = ManagedRuntime.make(
  evalStack({ agent: scriptedAgent(), runner: capturingRunner([]) })
);

type Services = Batches | Database | EvalReads;

const run = <A, E>(effect: Effect.Effect<A, E, Services>) =>
  runtime.runPromise(effect);

const reads = <A, E>(
  use: (service: EvalReads["Type"]) => Effect.Effect<A, E>
) => run(EvalReads.pipe(Effect.flatMap(use)));

const failureOf = async <A, E>(
  use: (service: EvalReads["Type"]) => Effect.Effect<A, E>
) => {
  const exit = await runtime.runPromiseExit(
    EvalReads.pipe(Effect.flatMap(use))
  );
  return Exit.isFailure(exit)
    ? Option.getOrNull(Cause.failureOption(exit.cause))
    : null;
};

const startAndExecute = (request: StartBatchRequest) =>
  run(
    Effect.gen(function* () {
      const batches = yield* Batches;
      const started = yield* batches.start(actor, request);
      yield* batches.execute(started.id);
      return started;
    })
  );

const checkout = requestOf({
  cases: [
    caseOf("pay", { tags: ["billing"], variables: { task: "pay the bill" } }),
    caseOf("refund", {
      tags: ["billing", "slow"],
      variables: { task: "refund the order" },
    }),
  ],
  trials: 2,
  variants: [
    variantOf(),
    variantOf({ harness: "claude", model: "sonnet", sandbox: "e2b" }),
  ],
});

const wide = requestOf({
  cases: [caseOf("wide", { variables: { task: "search widely" } })],
  suite: { id: "search", name: "Search", prompt: "{{task}}" },
  variants: Array.from({ length: 12 }, (_, index) =>
    variantOf({ model: `model-${index + 1}` })
  ),
});

describe.skipIf(skipWithoutDatabase())(
  "reading batches, runs and cases",
  () => {
    const batchIds: string[] = [];

    beforeAll(async () => {
      await run(
        Database.pipe(
          Effect.flatMap((db) =>
            Effect.promise(async () => {
              await seedOrganization(db, organizationId);
              await seedConnections(db, organizationId);
            })
          )
        )
      );
      batchIds.push((await startAndExecute(checkout)).id);
      batchIds.push((await startAndExecute(wide)).id);
      batchIds.push((await startAndExecute(wide)).id);
      batchIds.push(
        (
          await startAndExecute(
            requestOf({
              ...checkout,
              cases: [
                caseOf("pay", {
                  tags: ["billing"],
                  variables: { task: `pay the bill, it ${FAILING}` },
                }),
              ],
            })
          )
        ).id
      );
    });

    afterAll(async () => {
      await runtime.dispose();
    });

    it("reads a batch with every run and trial it holds", async () => {
      const batch = await reads((service) =>
        service.batch(organizationId, batchIds[0] ?? "")
      );

      expect(batch.status).toBe("finished");
      expect(batch.local).toBe(false);
      expect(batch.trigger).toEqual({ source: "ci" });
      expect(batch.runs).toHaveLength(4);
      expect(batch.runs.map((entry) => entry.case.id).toSorted()).toEqual([
        "pay",
        "pay",
        "refund",
        "refund",
      ]);
      expect(batch.runs.every((entry) => entry.trials.length === 2)).toBe(true);
      expect(batch.runs.every((entry) => entry.batchId === batch.id)).toBe(
        true
      );
    });

    it("keeps a batch to its own organization", async () => {
      expect(
        await failureOf((service) =>
          service.batch("org_someone_else", batchIds[0] ?? "")
        )
      ).toMatchObject({ _tag: "EvalNotFound", entity: "batch" });
      expect(
        await reads((service) =>
          service.ownedBatch(organizationId, batchIds[0] ?? "")
        )
      ).toEqual({ internalId: batchIds[0] ?? "", local: false });
    });

    it("lists batches newest first, a page at a time", async () => {
      const first = await reads((service) =>
        service.batches({ cursor: null, limit: 3, organizationId })
      );
      const second = await reads((service) =>
        service.batches({ cursor: first.next, limit: 3, organizationId })
      );
      const listed = [...first.batches, ...second.batches];
      const checkoutSummary = listed.find((entry) => entry.id === batchIds[0]);

      expect(first.total).toBe(4);
      expect(first.batches).toHaveLength(3);
      expect(first.next).not.toBeNull();
      expect(second.batches).toHaveLength(1);
      expect(second.next).toBeNull();
      expect(listed.map((entry) => entry.id)).toEqual(batchIds.toReversed());
      expect(checkoutSummary).toMatchObject({
        cases: 2,
        passed: 8,
        runs: 4,
        scored: 8,
        voided: 0,
      });
    });

    it("reads one run with its case, suite, variant and trials", async () => {
      const batch = await reads((service) =>
        service.batch(organizationId, batchIds[0] ?? "")
      );
      const target = batch.runs.find(
        (entry) =>
          entry.case.id === "refund" && entry.variant.harness === "claude"
      );
      const found = await reads((service) =>
        service.run(organizationId, target?.id ?? "")
      );

      expect(found.case).toEqual({ id: "refund", name: "refund" });
      expect(found.suite).toEqual({ id: "checkout", name: "Checkout" });
      expect(found.variant).toMatchObject({
        harness: "claude",
        model: "sonnet",
        profile: null,
        sandbox: "e2b",
        userModel: null,
      });
      expect(found.setup.prompt).toBe("refund the order");
      expect(found.setup.verify).toBe("npm test");
      expect(found.trials.map((trial) => trial.ordinal)).toEqual([1, 2]);
      expect(found.trials[0]?.trajectory.length).toBeGreaterThan(0);
      expect(found.distribution.passRate).toBe(1);
      expect(
        await failureOf((service) =>
          service.run("org_someone_else", target?.id ?? "")
        )
      ).toMatchObject({ _tag: "EvalNotFound", entity: "run" });
    });

    it("pages a case's runs and narrows them to one variant", async () => {
      const page = (number: number, variant: string | null = null) =>
        reads((service) =>
          service.caseRuns({
            caseId: "wide",
            organizationId,
            page: number,
            variant,
          })
        );
      const first = await page(1);
      const second = await page(2);
      const clamped = await page(0);
      const variant = first.runs[0]?.variant.id ?? "";
      const narrowed = await page(1, variant);

      expect(first.total).toBe(24);
      expect(first.pageSize).toBe(20);
      expect(first.runs).toHaveLength(20);
      expect(second.runs).toHaveLength(4);
      expect(
        new Set([...first.runs, ...second.runs].map((entry) => entry.id)).size
      ).toBe(24);
      expect(clamped.page).toBe(1);
      expect(narrowed.total).toBe(2);
      expect(narrowed.runs.map((entry) => entry.variant.id)).toEqual([
        variant,
        variant,
      ]);
      expect(first.runs.every((entry) => entry.trials.length === 1)).toBe(true);
    });

    it("lists cases with their suites, tags and newest result on each variant", async () => {
      const all = await reads((service) =>
        service.cases({
          cursor: null,
          limit: undefined,
          organizationId,
          suite: null,
          tag: null,
        })
      );
      const byId = new Map(all.cases.map((entry) => [entry.id, entry]));

      expect(all.cases.map((entry) => entry.id).toSorted()).toEqual([
        "pay",
        "refund",
        "wide",
      ]);
      expect(all.suites).toEqual([
        { id: "checkout", name: "Checkout" },
        { id: "search", name: "Search" },
      ]);
      expect(all.tags).toEqual(["billing", "slow"]);
      expect(byId.get("refund")?.tags).toEqual(["billing", "slow"]);
      expect(byId.get("refund")?.suite).toEqual({
        id: "checkout",
        name: "Checkout",
      });
      expect(byId.get("wide")?.variants).toHaveLength(12);
      expect(
        byId.get("wide")?.variants.every((entry) => entry.runs === 2)
      ).toBe(true);
      expect(
        byId.get("pay")?.variants.map((entry) => entry.distribution.failed)
      ).toEqual([2, 2]);
    });

    it("filters cases by suite and by tag", async () => {
      const filtered = (suite: string | null, tag: string | null) =>
        reads((service) =>
          service.cases({
            cursor: null,
            limit: undefined,
            organizationId,
            suite,
            tag,
          })
        ).then((page) => page.cases.map((entry) => entry.id).toSorted());

      expect(await filtered("search", null)).toEqual(["wide"]);
      expect(await filtered("checkout", null)).toEqual(["pay", "refund"]);
      expect(await filtered(null, "slow")).toEqual(["refund"]);
      expect(await filtered(null, "billing")).toEqual(["pay", "refund"]);
      expect(await filtered("search", "billing")).toEqual([]);
    });

    it("walks the case list a page at a time without repeating one", async () => {
      const walked: string[] = [];
      let cursor: EvalPageCursor | null = null;
      let pages = 0;

      do {
        const at: EvalPageCursor | null = cursor;
        const page: EvalCasePage = await reads((service) =>
          service.cases({
            cursor: at,
            limit: 1,
            organizationId,
            suite: null,
            tag: null,
          })
        );
        walked.push(...page.cases.map((entry) => entry.id));
        cursor = page.next;
        pages += 1;
      } while (cursor !== null && pages < 10);

      expect(walked.toSorted()).toEqual(["pay", "refund", "wide"]);
    });

    it("reads a case with every version and what each one changed", async () => {
      const detail = await reads((service) =>
        service.case(organizationId, "pay")
      );

      expect(detail.suite).toEqual({ id: "checkout", name: "Checkout" });
      expect(detail.tags).toEqual(["billing"]);
      expect(detail.setup.prompt).toBe(`pay the bill, it ${FAILING}`);
      expect(detail.versions.map((version) => version.changes)).toEqual([
        [],
        ["prompt"],
      ]);
      expect(detail.versions.every((version) => version.author === null)).toBe(
        true
      );
      expect(detail.variants).toHaveLength(2);
      expect(detail.variants.every((entry) => entry.runs === 2)).toBe(true);
      expect(
        await failureOf((service) => service.case(organizationId, "nothing"))
      ).toMatchObject({ _tag: "EvalNotFound", entity: "case" });
    });

    it("finds where a trial sits", async () => {
      const batch = await reads((service) =>
        service.batch(organizationId, batchIds[0] ?? "")
      );
      const target = batch.runs[0];
      const trial = target?.trials[1];
      const address = await reads((service) =>
        service.trialAddress(organizationId, trial?.id ?? "")
      );

      expect(address).toEqual({
        batchId: batchIds[0] ?? "",
        caseId: target?.case.id ?? "",
        ordinal: 2,
        runId: target?.id ?? "",
        trialId: trial?.id ?? "",
      });
      expect(
        await failureOf((service) =>
          service.trialAddress("org_someone_else", trial?.id ?? "")
        )
      ).toMatchObject({ _tag: "EvalNotFound", entity: "trial" });
    });

    it("tails a batch from its marks and moves them forward", async () => {
      const tail = (after: readonly EvalTailMark[]) =>
        reads((service) =>
          service.tail({ after, batchId: batchIds[0] ?? "", organizationId })
        );
      const first = await tail([]);
      const again = await tail(first.next);

      expect(first.running).toBe(false);
      expect(first.settled).toBe(8);
      expect(first.events.length).toBeGreaterThan(0);
      expect(first.next).toHaveLength(8);
      expect(first.next.every((mark) => mark.seq === 2)).toBe(true);
      expect(again.events).toEqual([]);
      expect(again.next).toEqual(first.next);
      expect(
        await failureOf((service) =>
          service.tail({ after: [], batchId: "bat_missing", organizationId })
        )
      ).toMatchObject({ _tag: "EvalNotFound", entity: "batch" });
    });

    it("does not hand out an artifact nobody stored", async () => {
      expect(
        await failureOf((service) =>
          service.artifact(organizationId, {
            path: "missing.txt",
            sha256: "0".repeat(64),
            trialId: "trl_missing",
          })
        )
      ).toMatchObject({ _tag: "EvalNotFound", entity: "artifact" });
    });
  }
);
