import { describe, expect, test } from "bun:test";
import type { Whoami } from "@sphynx/schema/public/auth-api";
import { Sphynx } from "../../src/client/sphynx";

const WHOAMI: Whoami = {
  credential: { kind: "apiKey", name: "ci", start: "anp_whoa" },
  organization: { id: "org_1", name: "Acme", slug: "acme" },
  permissions: ["evals:read", "evals:write"],
};

const answering = (body: unknown) => {
  const sent: Request[] = [];
  const original = globalThis.fetch;

  globalThis.fetch = Object.assign(
    (input: URL | RequestInfo, init?: RequestInit) => {
      const request = new Request(input as RequestInfo, init);
      if (request.method === "POST") {
        sent.push(request);
      }
      return Promise.resolve(Response.json(body));
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

describe("whoami", () => {
  test("asks the API which organization the key acts for", async () => {
    const { restore, sent } = answering(WHOAMI);

    try {
      const found = await new Sphynx({
        apiKey: "anp_secret",
        baseUrl: "http://x",
      }).whoami();

      expect(found).toEqual(WHOAMI);
      expect(new URL(sent[0]?.url ?? "").pathname).toBe("/v1/auth.whoami");
      expect(sent[0]?.headers.get("authorization")).toBe("Bearer anp_secret");
      expect(await sent[0]?.json()).toEqual({});
    } finally {
      restore();
    }
  });
});

describe("a Sphynx server that cannot be reached", () => {
  test("rejects with the address it tried and how to fix it", async () => {
    await expect(
      new Sphynx({
        apiKey: "anp_secret",
        baseUrl: "http://127.0.0.1:1",
      }).whoami()
    ).rejects.toThrow(
      "Unable to reach Sphynx at http://127.0.0.1:1. Check your network connection, or set SPHYNX_BASE_URL if your Sphynx server is at another address."
    );
  });
});
