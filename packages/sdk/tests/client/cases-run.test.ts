import { describe, expect, test } from "bun:test";
import { Anpord } from "../../src/client/anpord";

const capture = () => {
  const sent: Request[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = Object.assign(
    (input: URL | RequestInfo, init?: RequestInit) => {
      sent.push(new Request(input as RequestInfo, init));
      return Promise.resolve(
        new Response('{"id":"batch_1","runs":[]}', { status: 200 })
      );
    },
    { preconnect: original.preconnect }
  ) as typeof fetch;

  return {
    restore: () => {
      globalThis.fetch = original;
    },
    sent,
  };
};

describe("running a stored case again", () => {
  test("runs one trial on every variant when nothing else is named", async () => {
    const { restore, sent } = capture();

    try {
      await new Anpord({ apiKey: "k", baseUrl: "http://x" }).evals.cases.run({
        id: "writes-done",
      });

      expect(new URL(sent[0]?.url ?? "").pathname).toBe("/v1/evals.cases.run");
      expect(await sent[0]?.json()).toEqual({ id: "writes-done", trials: 1 });
    } finally {
      restore();
    }
  });

  test("refuses a case id that is not a handle before sending anything", async () => {
    const { restore, sent } = capture();

    try {
      await expect(
        new Anpord({ apiKey: "k", baseUrl: "http://x" }).evals.cases.run({
          id: "Not A Handle",
        })
      ).rejects.toThrow();
      expect(sent).toHaveLength(0);
    } finally {
      restore();
    }
  });
});
