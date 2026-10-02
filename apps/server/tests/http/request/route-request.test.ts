import { describe, expect, test } from "bun:test";
import type { AuthInstance } from "@sphynx/auth";
import { routeRequest } from "../../../src/http/request/route-request";

const reached = (name: string) => ({
  handler: () => Promise.resolve(new Response(`${name} reached`)),
});

const route = routeRequest({
  auth: reached("auth") as unknown as AuthInstance,
  internalApi: reached("internal"),
  publicApi: reached("public"),
  trustedOrigins: [],
});

const send = async (method: string, path: string) => {
  const response = await route(
    new Request(`http://sphynx.test${path}`, { method })
  );
  return {
    allow: response.headers.get("allow"),
    body: await response.text(),
    status: response.status,
    type: response.headers.get("content-type"),
  };
};

describe("a request that matches no route", () => {
  test("a GET on a POST-only route is a 405 that names the method to use", async () => {
    expect(await send("GET", "/v1/evals.suites.list")).toEqual({
      allow: "POST",
      body: JSON.stringify({
        _tag: "MethodNotAllowed",
        message: "Use POST for /v1/evals.suites.list.",
      }),
      status: 405,
      type: "application/json",
    });
  });

  test("an unknown /v1 path is a 404 that points to the API reference", async () => {
    expect(await send("POST", "/v1/evals.suites.lsit")).toEqual({
      allow: null,
      body: JSON.stringify({
        _tag: "NotFound",
        message:
          "There is no route /v1/evals.suites.lsit. See the API reference at https://docs.sphynx.sh/api-reference/introduction",
      }),
      status: 404,
      type: "application/json",
    });
  });

  test("a path outside every API is the same 404", async () => {
    const { body, status } = await send("GET", "/health");

    expect(status).toBe(404);
    expect(JSON.parse(body)).toEqual({
      _tag: "NotFound",
      message:
        "There is no route /health. See the API reference at https://docs.sphynx.sh/api-reference/introduction",
    });
  });

  test("the right method and a CORS preflight still reach the public API", async () => {
    expect((await send("POST", "/v1/evals.suites.list")).body).toBe(
      "public reached"
    );
    expect((await send("OPTIONS", "/v1/evals.suites.list")).body).toBe(
      "public reached"
    );
  });

  test("dashboard routes still reach the internal API", async () => {
    expect((await send("GET", "/api/healthz")).body).toBe("internal reached");
  });
});
