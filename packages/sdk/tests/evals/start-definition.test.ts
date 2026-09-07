import { describe, expect, test } from "bun:test";
import { Anpord } from "../../src/client/anpord";
import { smoke } from "./fixtures/named.eval";

const capture = () => {
  const sent: Request[] = [];
  const original = globalThis.fetch;

  const stub = (input: URL | RequestInfo, init?: RequestInit) => {
    sent.push(new Request(input as RequestInfo, init));
    return Promise.resolve(new Response('{"id":"run_1"}', { status: 200 }));
  };

  globalThis.fetch = Object.assign(stub, {
    preconnect: original.preconnect,
  }) as typeof fetch;

  return {
    restore: () => {
      globalThis.fetch = original;
    },
    sent,
  };
};

describe("starting from an imported eval", () => {
  test("sends the compiled request, not the definition", async () => {
    const { restore, sent } = capture();

    try {
      const anpord = new Anpord({ apiKey: "k", baseUrl: "http://x" });
      await anpord.evals.start(smoke);

      const body = (await sent[0]?.json()) as {
        cases: { name: string; validator: { source: string } }[];
        prompt: string;
      };

      expect(body.prompt).toBe("Create hello.txt");
      expect(body.cases[0]?.name).toBe("writes hello");
      expect(body.cases[0]?.validator.source).toContain("hello");
    } finally {
      restore();
    }
  });

  test("still accepts a plain request object", async () => {
    const { restore, sent } = capture();

    try {
      const anpord = new Anpord({ apiKey: "k", baseUrl: "http://x" });
      await anpord.evals.start({
        cases: [{ name: "a", verify: "true" }],
        prompt: "{{task}}",
        tasks: [{ harness: "codex", model: "m" }],
        trials: 1,
      });

      const body = (await sent[0]?.json()) as { prompt: string };
      expect(body.prompt).toBe("{{task}}");
    } finally {
      restore();
    }
  });
});
