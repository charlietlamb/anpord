import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { api, endpoint, withApi } from "../../src/mock-api";

const item = { id: "fixture", name: "Test item" };
const itemSchema = z.object({ id: z.string(), name: z.string() });
const catalog = api({
  name: "catalog",
  endpoints: [
    endpoint({
      method: "GET",
      path: "/items/:id",
      inputSchema: z.object({ params: z.object({ id: z.string() }) }),
      responses: { 200: itemSchema, 404: z.object({ message: z.string() }) },
      handler: ({ params }, { log }) => {
        log({ id: params.id });
        return params.id === item.id
          ? { status: 200, body: item }
          : { status: 404, body: { message: "Item not found" } };
      },
    }),
  ],
});

describe("HTTP API mocks", () => {
  test("serves real HTTP, records requests and supports error recovery", () =>
    withApi({
      api: catalog,
      run: async ({ url, calls }) => {
        expect((await fetch(`${url}/items/missing`)).status).toBe(404);
        expect(await (await fetch(`${url}/items/fixture`)).json()).toEqual(
          item
        );
        expect((await fetch(`${url}/unknown`)).status).toBe(404);
        const recorded = await calls();
        expect(recorded.map(({ status }) => status)).toEqual([404, 200, 404]);
        expect(recorded.map(({ matched }) => matched)).toEqual([
          true,
          true,
          false,
        ]);
        expect(recorded[0]?.logs[0]?.text).toContain("missing");
        expect(recorded.every(({ error }) => error === null)).toBe(true);
      },
    }));

  test("redacts headers and values without changing the response", () =>
    withApi({
      api: catalog,
      run: async ({ url, calls }) => {
        await fetch(`${url}/items/fixture?token=secret-value`, {
          headers: { authorization: "Bearer private" },
        });
        const evidence = JSON.stringify(await calls());
        expect(evidence).toContain("[redacted]");
        expect(evidence).not.toContain("secret-value");
        expect(evidence).not.toContain("Bearer private");
      },
    }));

  test("validates JSON bodies and response schemas", () =>
    withApi({
      api: api({
        name: "echo",
        endpoints: [
          endpoint({
            method: "POST",
            path: "/echo",
            inputSchema: z.object({ body: itemSchema }),
            responses: { 201: itemSchema },
            handler: ({ body }) => ({ status: 201, body }),
          }),
        ],
      }),
      run: async ({ url, calls }) => {
        const post = (body: string) =>
          fetch(`${url}/echo`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          });
        expect((await post("{")).status).toBe(400);
        expect((await post("{}")).status).toBe(400);
        const response = await post(JSON.stringify(item));
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual(item);
        expect(await calls()).toHaveLength(3);
      },
    }));

  test("fails the scope when a handler returns invalid output", async () => {
    await expect(
      withApi({
        api: api({
          name: "invalid",
          endpoints: [
            endpoint({
              method: "GET",
              path: "/",
              inputSchema: z.object({}),
              responses: { 200: itemSchema },
              handler: () => ({ status: 200, body: { id: 1 } }) as never,
            }),
          ],
        }),
        run: async ({ url, calls }) => {
          expect((await fetch(url)).status).toBe(500);
          expect((await calls())[0]?.error).not.toBeNull();
        },
      })
    ).rejects.toThrow("An API endpoint failed");
  });

  test("closes the port when the callback fails", async () => {
    let address = "";
    await expect(
      withApi({
        api: catalog,
        run: ({ url }) => {
          address = url;
          return Promise.reject(new Error("callback failed"));
        },
      })
    ).rejects.toThrow("callback failed");
    await expect(fetch(address)).rejects.toThrow();
  });

  test("fails and closes the server when the evidence limit is exceeded", async () => {
    let address = "";
    await expect(
      withApi({
        api: catalog,
        run: async ({ url }) => {
          address = url;
          for (let index = 0; index < 257; index++) {
            await (await fetch(`${url}/items/fixture`)).text();
          }
        },
      })
    ).rejects.toThrow("API request limit exceeded");
    await expect(fetch(address)).rejects.toThrow();
  });

  test("rejects ambiguous routes", () => {
    const route = catalog.endpoints[0];
    if (!route) {
      throw new Error("Missing fixture endpoint");
    }
    expect(() =>
      api({
        name: "duplicate",
        endpoints: [route, { ...route, path: "/items/:other" }],
      })
    ).toThrow("Duplicate API endpoint");
  });
});
