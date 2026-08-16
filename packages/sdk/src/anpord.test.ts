import { describe, expect, test } from "bun:test";
import { Anpord } from "./anpord";
import { AnpordError, asAnpordError, MissingApiKey } from "./errors";

const withoutEnvKey = <A>(run: () => A) => {
  const previous = process.env.ANPORD_API_KEY;
  process.env.ANPORD_API_KEY = "";
  try {
    return run();
  } finally {
    process.env.ANPORD_API_KEY = previous ?? "";
  }
};

describe("credentials", () => {
  test("an explicit key is accepted", () => {
    expect(new Anpord({ apiKey: "explicit" })).toBeInstanceOf(Anpord);
  });

  test("the environment supplies the key when the caller does not", () => {
    process.env.ANPORD_API_KEY = "from-environment";
    expect(new Anpord()).toBeInstanceOf(Anpord);
  });

  test("a missing key fails at construction rather than on first call", () => {
    withoutEnvKey(() => {
      expect(() => new Anpord()).toThrow(MissingApiKey);
    });
  });
});

describe("surface", () => {
  test("every endpoint in the group is reachable", () => {
    const anpord = new Anpord({ apiKey: "k" });
    expect(Object.keys(anpord.prompts).toSorted()).toEqual([
      "archive",
      "create",
      "get",
      "list",
      "promote",
      "update",
    ]);
  });
});

describe("errors", () => {
  test("a tagged failure keeps its message and gains a status", () => {
    const error = asAnpordError({
      _tag: "NotFound",
      message: 'No prompt with id "missing"',
    });
    expect(error).toBeInstanceOf(AnpordError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('No prompt with id "missing"');
  });

  test("an unrecognised failure still becomes a usable error", () => {
    const error = asAnpordError({ _tag: "SomethingElse" });
    expect(error.status).toBeUndefined();
    expect(error.message).toBe("SomethingElse");
  });

  test("the original failure survives for callers who need it", () => {
    const cause = { _tag: "Conflict", message: "taken" };
    expect(asAnpordError(cause).cause).toBe(cause);
  });

  test("an error is not rewrapped", () => {
    const error = new AnpordError("already mapped", { cause: null });
    expect(asAnpordError(error)).toBe(error);
  });
});
