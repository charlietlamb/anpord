import { describe, expect, it } from "bun:test";
import { Cause, Effect, Option } from "effect";
import { HarnessUnavailable } from "../../src/domain/errors";
import { settleFailedRun } from "../../src/grid/settle-failed-run";

const settle = (cause: Cause.Cause<unknown>) => {
  const finished: Record<string, unknown>[] = [];
  const published: Record<string, unknown>[] = [];

  return Effect.runPromise(
    settleFailedRun({
      cause,
      created: { id: "run_1", internalId: "rin_1" },
      live: {
        update: (_id: string, project: (state: never) => unknown) =>
          Effect.sync(() => {
            published.push(project({} as never) as Record<string, unknown>);
          }),
      } as never,
      runs: {
        finish: (input: Record<string, unknown>) =>
          Effect.sync(() => {
            finished.push(input);
          }),
      } as never,
    }).pipe(Effect.map(() => ({ finished, published })))
  );
};

describe("a run that died before its cells reported", () => {
  it("is failed rather than left saying running", async () => {
    const { finished } = await settle(
      Cause.fail(new HarnessUnavailable({ harness: "codex", reason: "no key" }))
    );

    expect(finished[0]).toMatchObject({ status: "failed" });
    expect(finished[0]?.finishedAt).toBeInstanceOf(Date);
  });

  it("says why, so the reader is not left guessing", async () => {
    const { finished } = await settle(
      Cause.fail(new HarnessUnavailable({ harness: "codex", reason: "no key" }))
    );

    expect(finished[0]?.failure).toContain("no key");
  });

  /* A defect carries no tagged error, and is exactly the shape that used to
     vanish into orDie. */
  it("reports a defect too", async () => {
    const { finished } = await settle(Cause.die(new Error("sandbox refused")));

    expect(finished[0]).toMatchObject({ status: "failed" });
    expect(String(finished[0]?.failure)).toContain("could not start");
  });

  it("tells whoever is watching the run", async () => {
    const { published } = await settle(Cause.die(new Error("gone")));

    expect(published[0]).toMatchObject({ status: "failed" });
    expect(
      Option.isSome(published[0]?.finishedAt as Option.Option<number>)
    ).toBe(true);
  });
});
