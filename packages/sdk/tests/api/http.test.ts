import { expect, test } from "bun:test";
import { z } from "zod";
import { api, endpoint, withApi } from "../../src/mock-api";

test("preserves repeated queries and wire inputs before schema transforms", () =>
  withApi({
    api: api({
      name: "query",
      endpoints: [
        endpoint({
          method: "GET",
          path: "/items/:id",
          inputSchema: z.object({
            params: z.object({ id: z.string() }),
            query: z.object({
              tag: z.array(z.string()),
              page: z.coerce.number(),
            }),
          }),
          responses: {
            200: z.object({
              id: z.string(),
              page: z.number(),
              tag: z.array(z.string()),
            }),
          },
          handler: ({ params, query }) => ({
            status: 200,
            body: { ...params, ...query },
          }),
        }),
      ],
    }),
    run: async ({ url, calls }) => {
      expect(
        await (
          await fetch(`${url}/items/hello%20world?tag=a&tag=b&page=2`)
        ).json()
      ).toEqual({ id: "hello world", tag: ["a", "b"], page: 2 });
      expect((await calls())[0]?.input.text).toContain('"page":"2"');
    },
  }));

test("uses literal routes before parameters and omits HEAD and 204 bodies", () =>
  withApi({
    api: api({
      name: "routing",
      endpoints: [
        endpoint({
          method: "GET",
          path: "/:id",
          inputSchema: z.object({}),
          responses: { 200: z.string() },
          handler: () => ({ status: 200, body: "parameter" }),
        }),
        endpoint({
          method: "GET",
          path: "/literal",
          inputSchema: z.object({}),
          responses: { 200: z.string() },
          handler: () => ({
            status: 200,
            body: "literal",
            headers: { "x-fixture": "yes" },
          }),
        }),
        endpoint({
          method: "DELETE",
          path: "/",
          inputSchema: z.object({}),
          responses: { 204: z.null() },
          handler: () => ({ status: 204, body: null }),
        }),
      ],
    }),
    run: async ({ url, calls }) => {
      const response = await fetch(`${url}/literal`);
      expect(await response.json()).toBe("literal");
      expect(response.headers.get("x-fixture")).toBe("yes");
      expect(
        await (await fetch(`${url}/literal`, { method: "HEAD" })).text()
      ).toBe("");
      expect(await (await fetch(url, { method: "DELETE" })).text()).toBe("");
      expect((await calls()).map(({ status }) => status)).toEqual([
        200, 200, 204,
      ]);
    },
  }));

test("bounds bodies and accepts only JSON media types", () =>
  withApi({
    api: api({
      name: "limits",
      endpoints: [
        endpoint({
          method: "POST",
          path: "/",
          inputSchema: z.object({}),
          responses: { 200: z.null() },
          handler: () => ({ status: 200, body: null }),
        }),
      ],
    }),
    run: async ({ url }) => {
      const post = (body: string, contentType: string) =>
        fetch(url, {
          method: "POST",
          headers: { "content-type": contentType },
          body,
        });
      expect((await post("{}", "text/not-json")).status).toBe(415);
      expect((await post("{}", "application/vnd.api+json")).status).toBe(200);
      expect(
        (await post(JSON.stringify("a".repeat(1_048_577)), "application/json"))
          .status
      ).toBe(413);
    },
  }));

test("marks bounded evidence explicitly and redacts nested response fields", () =>
  withApi({
    api: api({
      name: "capture",
      redact: ["accessToken"],
      endpoints: [
        endpoint({
          method: "GET",
          path: "/",
          inputSchema: z.object({}),
          responses: {
            200: z.object({ accessToken: z.string(), text: z.string() }),
          },
          handler: (_, { log }) => {
            log({ password: "private" });
            return {
              status: 200,
              body: { accessToken: "hidden", text: "x".repeat(20_000) },
            };
          },
        }),
      ],
    }),
    run: async ({ url, calls }) => {
      await fetch(url);
      const [call] = await calls();
      expect(call?.output.truncated).toBe(true);
      expect(call?.output.text.length).toBe(16_000);
      expect(JSON.stringify(call)).not.toContain("hidden");
      expect(JSON.stringify(call)).not.toContain("private");
    },
  }));
