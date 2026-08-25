import { describe, expect, it } from "bun:test";
import { Effect, Layer, Redacted } from "effect";
import { AutumnService, AutumnServiceLive } from "../src/autumn";
import { BillingConfig } from "../src/config";

/* The SDK's own routes, which are not the paths the REST reference documents. */
const CUSTOMER_PATH = "/v1/customers.get_or_create";
const TRACK_PATH = "/v1/balances.track";

/* The SDK validates responses, so a bare { ok: true } is rejected before the
   caller sees it. These are the shapes its schemas require. */
const CUSTOMER = {
  created_at: 0,
  email: null,
  env: "sandbox",
  fingerprint: null,
  id: "org_1",
  metadata: {},
  name: null,
  purchases: [],
  send_email_receipts: false,
  stripe_id: null,
  subscriptions: [],
};

const TRACKED = {
  balances: {},
  customer_id: "org_1",
  deductions: [],
  value: 12,
};

interface Seen {
  readonly auth: string;
  readonly body: Record<string, unknown>;
  readonly path: string;
}

/* A real server, because what is worth testing is the request that leaves
   this machine, and a stubbed client would assert our own idea of it back. */
const withServer = async (
  status: number,
  run: (autumn: AutumnService["Type"]) => Effect.Effect<void, unknown>
) => {
  const seen: Seen[] = [];
  const server = Bun.serve({
    fetch: async (request) => {
      const path = new URL(request.url).pathname;

      seen.push({
        auth: request.headers.get("authorization") ?? "",
        body: (await request.json()) as Record<string, unknown>,
        path,
      });

      return Response.json(path === TRACK_PATH ? TRACKED : CUSTOMER, {
        status,
      });
    },
    port: 0,
  });

  const config = Layer.succeed(BillingConfig, {
    autumn: {
      apiKey: Redacted.make("sk_test"),
      baseUrl: `http://localhost:${server.port}`,
    },
  });

  const outcome = await Effect.runPromise(
    AutumnService.pipe(
      Effect.flatMap((autumn) => run(autumn).pipe(Effect.either)),
      Effect.provide(AutumnServiceLive.pipe(Layer.provide(config)))
    )
  );

  server.stop();

  return { outcome, seen };
};

describe("reaching Autumn", () => {
  it("creates a customer under the organisation's own id", async () => {
    const { seen } = await withServer(200, (autumn) =>
      autumn.call("register", (client) =>
        client.customers.getOrCreate({ customerId: "org_1", name: "Acme" })
      )
    );

    expect(seen).toHaveLength(1);
    expect(seen[0]?.path).toBe(CUSTOMER_PATH);
    expect(seen[0]?.auth).toBe("Bearer sk_test");
    expect(seen[0]?.body.customer_id).toBe("org_1");
  });

  it("counts trials against the feature", async () => {
    const { seen } = await withServer(200, (autumn) =>
      autumn.call("track", (client) =>
        client.track({
          customerId: "org_1",
          featureId: "evals",
          value: 12,
        })
      )
    );

    expect(seen[0]?.path).toBe(TRACK_PATH);
    expect(seen[0]?.body).toEqual({
      customer_id: "org_1",
      feature_id: "evals",
      value: 12,
    });
  });

  /* The SDK fails open by default, returning success and dropping the event.
     Turned off, because losing usage silently is worse than knowing. */
  it("reports a refusal rather than swallowing it", async () => {
    const { outcome } = await withServer(500, (autumn) =>
      autumn.call("register", (client) =>
        client.customers.getOrCreate({ customerId: "org_1" })
      )
    );

    expect(outcome._tag).toBe("Left");
  });
});

describe("a deployment with no billing configured", () => {
  it("calls nothing and fails nothing", async () => {
    const done = await Effect.runPromise(
      AutumnService.pipe(
        Effect.flatMap((autumn) =>
          autumn.call("track", () => Promise.reject(new Error("unreachable")))
        ),
        Effect.as(true),
        Effect.provide(
          AutumnServiceLive.pipe(
            Layer.provide(Layer.succeed(BillingConfig, { autumn: undefined }))
          )
        )
      )
    );

    expect(done).toBe(true);
  });
});
