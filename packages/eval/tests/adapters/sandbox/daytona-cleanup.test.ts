import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  Daytona,
  DaytonaAuthenticationError,
  DaytonaNotFoundError,
} from "@daytonaio/sdk";
import { Effect } from "effect";
import { makeConfiguredDaytonaAdapter } from "../../../src/adapters/sandbox/daytona";

const get = spyOn(Daytona.prototype, "get");
afterEach(() => get.mockReset());
afterAll(() => get.mockRestore());

const destroy = () =>
  Effect.runPromise(
    Effect.gen(function* () {
      const adapter = yield* makeConfiguredDaytonaAdapter({ apiKey: "mock" });
      return yield* adapter.destroy({ id: "mock-sandbox" });
    }).pipe(Effect.either)
  );

describe("Daytona cleanup", () => {
  test("accepts an already absent sandbox", async () => {
    get.mockRejectedValue(new DaytonaNotFoundError("Sandbox not found"));
    expect((await destroy())._tag).toBe("Right");
    expect(get).toHaveBeenCalledWith("mock-sandbox");
  });

  test("preserves authentication failures", async () => {
    get.mockRejectedValue(new DaytonaAuthenticationError("Unauthorized"));
    expect((await destroy())._tag).toBe("Left");
  });

  test("does not infer absence from an error message", async () => {
    get.mockRejectedValue(new Error("Sandbox not found"));
    expect((await destroy())._tag).toBe("Left");
  });
});
