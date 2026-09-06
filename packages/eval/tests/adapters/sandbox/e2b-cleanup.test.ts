import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import { Sandbox } from "e2b";
import { Effect } from "effect";
import { makeConfiguredE2BAdapter } from "../../../src/adapters/sandbox/e2b";

const kill = spyOn(Sandbox, "kill");
afterEach(() => kill.mockReset());
afterAll(() => kill.mockRestore());

const destroy = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* makeConfiguredE2BAdapter({ apiKey: "mock" });
      return yield* adapter.destroy({ id: "mock-sandbox" });
    }).pipe(Effect.either)
  );

describe("E2B cleanup", () => {
  test.each([true, false])("accepts deletion result %s", async (found) => {
    kill.mockResolvedValue(found);
    expect((await destroy())._tag).toBe("Right");
    expect(kill).toHaveBeenCalledWith("mock-sandbox", { apiKey: "mock" });
  });

  test("preserves provider failures", async () => {
    kill.mockRejectedValue(new Error("Unauthorized"));
    expect((await destroy())._tag).toBe("Left");
  });
});
