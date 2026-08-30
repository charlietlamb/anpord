import { describe, expect, test } from "bun:test";
import { Anpord } from "../../src/client/anpord";
import {
  AnpordError,
  asAnpordError,
  MissingApiKey,
} from "../../src/client/errors";

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
    expect(Object.keys(anpord.evals).toSorted()).toEqual([
      "cellHistory",
      "get",
      "list",
      "models",
      "rerunCell",
      "start",
      "startAndWait",
      "wait",
    ]);
    expect(Object.keys(anpord.prompts).toSorted()).toEqual([
      "create",
      "get",
      "list",
      "promote",
      "update",
    ]);
  });

  test("a result is the decoded value, not a tuple carrying the response", () => {
    const reachable = async (anpord: Anpord) => {
      const prompt = await anpord.prompts.get({
        id: "greeting",
      });
      const listed = await anpord.prompts.list();
      const created = await anpord.prompts.create({
        content: "hello",
        id: "greeting",
        name: "Greeting",
      });
      const updated = await anpord.prompts.update({
        content: "hello again",
        id: "greeting",
      });
      const promoted = await anpord.prompts.promote({
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
const PROVIDER_ERROR = /provider/;
const MODEL_ERROR = /model/;

describe("validation", () => {
  test("an id the api would refuse is named, not dumped as a schema", async () => {
    const anpord = new Anpord({ apiKey: "unused" });
    const failure = anpord.prompts.get({ id: "NOT A VALID ID" });
    await expect(failure).rejects.toThrow(EXPLAINS_THE_RULE);
  });

  test("a rejected field never reaches the network", async () => {
    const anpord = new Anpord({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(anpord.prompts.get({ id: "" })).rejects.toThrow(
      NAMES_THE_FIELD
    );
  });

  test("public evals reject a local sandbox before the network", async () => {
    const anpord = new Anpord({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(
      anpord.evals.start({
        cases: [
          {
            variables: { task: "Write hello.txt" },
            name: "writes a file",
            verify: "test -f hello.txt",
          },
        ],
        prompt: "{{task}}",
        tasks: [{ harness: "codex", model: "gpt-5.6-sol", provider: "local" }],
        trials: 1,
      } as never)
    ).rejects.toThrow(PROVIDER_ERROR);
  });

  test("public evals reject an empty model before the network", async () => {
    const anpord = new Anpord({
      apiKey: "unused",
      baseUrl: "http://127.0.0.1:1",
    });
    await expect(
      anpord.evals.start({
        cases: [
          {
            variables: { task: "Write hello.txt" },
            name: "writes a file",
            verify: "test -f hello.txt",
          },
        ],
        prompt: "{{task}}",
        tasks: [{ harness: "codex", model: "", provider: "daytona" }],
        trials: 1,
      })
    ).rejects.toThrow(MODEL_ERROR);
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

  test("a refused permission keeps its forbidden status", () => {
    expect(
      asAnpordError({ _tag: "Forbidden", message: "no grant" }).status
    ).toBe(403);
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
