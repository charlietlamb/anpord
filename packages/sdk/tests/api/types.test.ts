import { expect, test } from "bun:test";
import { z } from "zod";
import { endpoint } from "../../src/mock-api";

const inputSchema = z.object({ params: z.object({ id: z.string() }) });
const responses = {
  200: z.object({ id: z.string() }),
  404: z.object({ message: z.string() }),
};

test("infers async handlers and correlates status with the body", async () => {
  const route = endpoint({
    method: "GET",
    path: "/items/:id",
    inputSchema,
    responses,
    handler: async ({ params }) => ({ status: 200, body: { id: params.id } }),
  });
  expect(
    await route.handler(
      { params: { id: "fixture" } },
      { signal: new AbortController().signal, log: () => undefined }
    )
  ).toEqual({ status: 200, body: { id: "fixture" } });
});

endpoint({
  method: "GET",
  path: "/",
  inputSchema,
  responses,
  // @ts-expect-error Undeclared status.
  handler: () => ({ status: 201, body: { id: "fixture" } }),
});
endpoint({
  method: "GET",
  path: "/",
  inputSchema,
  responses,
  // @ts-expect-error Body belongs to a different status.
  handler: () => ({ status: 404, body: { id: "fixture" } }),
});
endpoint({
  method: "GET",
  path: "/",
  inputSchema,
  responses,
  // @ts-expect-error Input is inferred from the schema.
  handler: ({ params }) => ({ status: 200, body: { id: params.missing } }),
});
