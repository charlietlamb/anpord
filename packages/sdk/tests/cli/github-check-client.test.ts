import { describe, expect, test } from "bun:test";
import {
  HttpClient,
  type HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Effect, Layer, Option, Redacted } from "effect";
import type { CheckRun } from "../../src/cli/github-check";
import {
  GithubCheckFailed,
  postCheckRun,
} from "../../src/cli/github-check-client";
import type { GithubContext } from "../../src/cli/github-context";

const context: GithubContext = {
  repository: "acme/widgets",
  sha: "abc123",
  token: Redacted.make("ghs_secret"),
};

const check: CheckRun = {
  conclusion: "success",
  details_url: "https://anpord.test/evals/run_1",
  name: "anpord",
  output: { summary: "| a |", title: "No cell regressed" },
};

const answering = (status: number) => {
  const seen: HttpClientRequest.HttpClientRequest[] = [];
  const layer = Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make((request) => {
      seen.push(request);
      return Effect.succeed(
        HttpClientResponse.fromWeb(request, new Response("{}", { status }))
      );
    })
  );

  return { layer, seen };
};

describe("posting a check to GitHub", () => {
  test("creates the check run on the repository with a bearer token", async () => {
    const { layer, seen } = answering(201);

    await Effect.runPromise(
      postCheckRun(context, check).pipe(Effect.provide(layer))
    );

    const [request] = seen;
    expect(request?.method).toBe("POST");
    expect(request?.url).toBe(
      "https://api.github.com/repos/acme/widgets/check-runs"
    );
    expect(request?.headers.authorization).toBe("Bearer ghs_secret");
    expect(request?.headers.accept).toBe("application/vnd.github+json");
    expect(request?.headers["x-github-api-version"]).toBe("2022-11-28");
    expect(request?.body._tag).toBe("Uint8Array");
    if (request?.body._tag === "Uint8Array") {
      expect(JSON.parse(new TextDecoder().decode(request.body.body))).toEqual({
        ...check,
        head_sha: "abc123",
        status: "completed",
      });
    }
  });

  test("a refusal is a named failure that says why", async () => {
    const { layer } = answering(403);

    const outcome = await Effect.runPromise(
      postCheckRun(context, check).pipe(Effect.provide(layer), Effect.flip)
    );

    expect(outcome).toBeInstanceOf(GithubCheckFailed);
    expect(outcome.status).toEqual(Option.some(403));
    expect(outcome.message).toContain("403");
    expect(outcome.message).not.toContain("ghs_secret");
  });
});
