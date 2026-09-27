import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Whoami } from "@anpord/schema/public/auth-api";
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import {
  announceOrganization,
  whoami,
  whoamiLines,
} from "../../src/cli/whoami-command";
import { ClientLayer } from "../../src/client/config";

const ACME: Whoami = {
  credential: { kind: "apiKey", name: "ci", start: "anp_whoa" },
  organization: { id: "org_1", name: "Acme", slug: "acme" },
  permissions: ["evals:read", "evals:write"],
};

let answer: { readonly body: unknown; readonly status: number } = {
  body: ACME,
  status: 200,
};

const server = Bun.serve({
  port: 0,
  fetch: (request) =>
    new URL(request.url).pathname === "/v1/auth.whoami" &&
    request.headers.get("authorization") === "Bearer anp_secret"
      ? Response.json(answer.body, { status: answer.status })
      : Response.json({ _tag: "NotFound", message: "no" }, { status: 404 }),
});

const environment = { ...process.env };

beforeAll(() => {
  process.env.ANPORD_API_KEY = "anp_secret";
  process.env.ANPORD_BASE_URL = server.url.href.slice(0, -1);
});

afterAll(() => {
  process.env = environment;
  server.stop(true);
});

const captured = async (run: () => Promise<unknown>) => {
  const out: string[] = [];
  const err: string[] = [];
  const { stderr, stdout } = process;
  const writeOut = stdout.write;
  const writeErr = stderr.write;
  const log = console.log;
  console.log = (line: string) => out.push(`${line}\n`);
  stdout.write = ((chunk: string) =>
    out.push(chunk) > 0) as typeof stdout.write;
  stderr.write = ((chunk: string) =>
    err.push(chunk) > 0) as typeof stderr.write;
  try {
    await run();
  } finally {
    stdout.write = writeOut;
    stderr.write = writeErr;
    console.log = log;
  }
  return { stderr: err.join(""), stdout: out.join("") };
};

const cli = Command.run(
  Command.make("anpord").pipe(
    Command.withSubcommands([Command.provide(whoami, ClientLayer)])
  ),
  { name: "Anpord", version: "0.0.0" }
);

const runCli = (...args: string[]) =>
  captured(() =>
    Effect.runPromise(
      cli(["node", "anpord", ...args]).pipe(
        Effect.provide(Layer.mergeAll(NodeContext.layer, FetchHttpClient.layer))
      )
    )
  );

describe("anpord whoami", () => {
  test("prints one fact per line, aligned", async () => {
    answer = { body: ACME, status: 200 };

    const { stdout } = await runCli("whoami");

    expect(stdout).toBe(
      [
        "organization       Acme",
        "organization slug  acme",
        "organization id    org_1",
        "key                ci",
        "key starts with    anp_whoa",
        "permissions        evals:read, evals:write",
        "",
      ].join("\n")
    );
  });

  test("--json prints the response as it came", async () => {
    answer = { body: ACME, status: 200 };

    const { stdout } = await runCli("whoami", "--json");

    expect(JSON.parse(stdout)).toEqual(ACME);
  });

  test("an OAuth token with no grants says so rather than leaving a blank", () => {
    expect(
      whoamiLines({
        credential: { kind: "oauth" },
        organization: { id: "org_2", name: "Beta", slug: "beta" },
        permissions: [],
      })
    ).toEqual([
      "organization       Beta",
      "organization slug  beta",
      "organization id    org_2",
      "credential         OAuth token",
      "permissions        none",
    ]);
  });
});

describe("the organization line at the start of an eval", () => {
  const announce = () =>
    captured(() =>
      Effect.runPromise(
        announceOrganization.pipe(
          Effect.provide(ClientLayer),
          Effect.provide(FetchHttpClient.layer)
        )
      )
    );

  test("names the organization the runs land in", async () => {
    answer = { body: ACME, status: 200 };

    expect(await announce()).toEqual({
      stderr: "  Org      Acme (acme)\n",
      stdout: "",
    });
  });

  test("a server without whoami leaves the run to carry on unannounced", async () => {
    answer = { body: { _tag: "NotFound", message: "no" }, status: 404 };

    expect(await announce()).toEqual({ stderr: "", stdout: "" });
  });
});
