import { describe, expect, test } from "bun:test";
import {
  asSphynxError,
  MissingApiKey,
  SphynxError,
} from "../../src/client/errors";
import { Sphynx } from "../../src/client/sphynx";

const withoutEnvKey = <A>(run: () => A) => {
  const previous = process.env.SPHYNX_API_KEY;
  process.env.SPHYNX_API_KEY = "";
  try {
    return run();
  } finally {
    process.env.SPHYNX_API_KEY = previous ?? "";
  }
};

describe("credentials", () => {
  test("an explicit key is accepted", () => {
    expect(new Sphynx({ apiKey: "explicit" })).toBeInstanceOf(Sphynx);
  });

  test("the environment supplies the key when the caller does not", () => {
    process.env.SPHYNX_API_KEY = "from-environment";
    expect(new Sphynx()).toBeInstanceOf(Sphynx);
  });

  test("a key of only whitespace counts as missing", () => {
    const previous = process.env.SPHYNX_API_KEY;
    process.env.SPHYNX_API_KEY = "   ";
    try {
      expect(() => new Sphynx()).toThrow(MissingApiKey);
    } finally {
      process.env.SPHYNX_API_KEY = previous ?? "";
    }
  });

  test("a missing key fails at construction rather than on first call", () => {
    withoutEnvKey(() => {
      expect(() => new Sphynx()).toThrow(MissingApiKey);
    });
  });
});

describe("surface", () => {
  test("every endpoint in the group is reachable", () => {
    const sphynx = new Sphynx({ apiKey: "k" });
    expect(Object.keys(sphynx.evals).toSorted()).toEqual([
      "batches",
      "cases",
      "models",
      "runs",
      "suites",
    ]);
    expect(Object.keys(sphynx.evals.batches).toSorted()).toEqual([
      "get",
      "list",
      "start",
      "startAndWait",
      "wait",
    ]);
    expect(Object.keys(sphynx.evals.cases).toSorted()).toEqual([
      "get",
      "list",
      "run",
    ]);
    expect(Object.keys(sphynx.evals.runs).toSorted()).toEqual(["get", "list"]);
    expect(Object.keys(sphynx.evals.models)).toEqual(["list"]);
    expect(Object.keys(sphynx).toSorted()).toEqual([
      "evals",
      "prompts",
      "runtime",
      "whoami",
    ]);
    expect(Object.keys(sphynx.prompts).toSorted()).toEqual([
      "create",
      "get",
      "list",
      "promote",
      "update",
    ]);
  });

  test("a result is the decoded value, not a tuple carrying the response", () => {
    const reachable = async (sphynx: Sphynx) => {
      const prompt = await sphynx.prompts.get({
        id: "greeting",
      });
      const listed = await sphynx.prompts.list();
      const created = await sphynx.prompts.create({
        content: "hello",
        id: "greeting",
        name: "Greeting",
      });
      const updated = await sphynx.prompts.update({
        content: "hello again",
        id: "greeting",
      });
      const promoted = await sphynx.prompts.promote({
        channel: "production",
        id: "greeting",
        version: 1,
      });
      return [
        prompt.content,
        listed.data.length,
        created.version,
        updated.version,
        promoted.ok,
      ] as const;
    };

    expect(reachable).toBeInstanceOf(Function);
  });
});

const NAMES_THE_FIELD = /^id: /;
const EXPLAINS_THE_RULE = /^id: Prompt id must be lowercase/;
const SANDBOX_ERROR = /sandbox/;
const MODEL_ERROR = /model/;

describe("validation", () => {
  test("an id the api would refuse is named, not dumped as a schema", async () => {
    const sphynx = new Sphynx({ apiKey: "unused" });
    const failure = sphynx.prompts.get({ id: "NOT A VALID ID" });
    await expect(failure).rejects.toThrow(EXPLAINS_THE_RULE);
  });

  test("a rejected field never reaches the network", async () => {
    const sphynx = new Sphynx({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(sphynx.prompts.get({ id: "" })).rejects.toThrow(
      NAMES_THE_FIELD
    );
  });

  test("a batch rejects a local sandbox before the network", async () => {
    const sphynx = new Sphynx({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(
      sphynx.evals.batches.start({
        cases: [
          {
            variables: { task: "Write hello.txt" },
            id: "writes-a-file",
            name: "writes a file",
            prepare: null,
            source: { kind: "empty" },
            verify: "test -f hello.txt",
          },
        ],
        suite: { id: "writes", name: "writes", prompt: "{{task}}" },
        variants: [
          { harness: "codex", model: "gpt-5.6-sol", sandbox: "local" },
        ],
        trials: 1,
      } as never)
    ).rejects.toThrow(SANDBOX_ERROR);
  });

  test("a batch rejects an empty model before the network", async () => {
    const sphynx = new Sphynx({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(
      sphynx.evals.batches.start({
        cases: [
          {
            variables: { task: "Write hello.txt" },
            id: "writes-a-file",
            name: "writes a file",
            prepare: null,
            source: { kind: "empty" },
            verify: "test -f hello.txt",
          },
        ],
        suite: { id: "writes", name: "writes", prompt: "{{task}}" },
        variants: [{ harness: "codex", model: "", sandbox: "daytona" }],
        trials: 1,
      })
    ).rejects.toThrow(MODEL_ERROR);
  });
});

describe("errors", () => {
  test("a tagged failure keeps its message and gains a status", () => {
    const error = asSphynxError({
      _tag: "NotFound",
      message: 'No prompt with id "missing"',
    });
    expect(error).toBeInstanceOf(SphynxError);
    expect(error.status).toBe(404);
    expect(error.message).toBe('No prompt with id "missing"');
  });

  test("a refused permission keeps its forbidden status", () => {
    expect(
      asSphynxError({ _tag: "Forbidden", message: "no grant" }).status
    ).toBe(403);
  });

  test("an unrecognised failure still becomes a usable error", () => {
    const error = asSphynxError({ _tag: "SomethingElse" });
    expect(error.status).toBeUndefined();
    expect(error.message).toBe("SomethingElse");
  });

  test("the original failure survives for callers who need it", () => {
    const cause = { _tag: "Conflict", message: "taken" };
    expect(asSphynxError(cause).cause).toBe(cause);
  });

  test("an error is not rewrapped", () => {
    const error = new SphynxError("already mapped", { cause: null });
    expect(asSphynxError(error)).toBe(error);
  });
});
