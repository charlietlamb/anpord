import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { Chunk, Effect, Stream } from "effect";
import type { ProviderName } from "../../src/domain/cell";
import { EvalSandboxLive } from "../../src/layer";
import { SandboxProvider } from "../../src/ports/sandbox";
import {
  BROKEN_SOURCE,
  TEST_SOURCE,
  VERIFY_COMMAND,
} from "../fixtures/broken-task";

const read = (name: string) => {
  const path = process.env.EVAL_KEY_DIR;
  try {
    return path === undefined
      ? undefined
      : readFileSync(`${path}/${name}`, "utf8").trim();
  } catch {
    return;
  }
};

process.env.E2B_API_KEY ??= read("e2b.key");
process.env.DAYTONA_API_KEY ??= read("daytona.key");
process.env.MODAL_TOKEN_ID ??= read("modal-token-id.key");
process.env.MODAL_TOKEN_SECRET ??= read("modal-token-secret.key");
process.env.CLOUDFLARE_API_TOKEN ??= read("cloudflare-api-token.key");
process.env.CLOUDFLARE_SANDBOX_URL ??= read("cloudflare-sandbox-url.key");
process.env.CLOUDFLARE_SANDBOX_API_KEY ??= read(
  "cloudflare-sandbox-api-key.key"
);
process.env.VERCEL_OIDC_TOKEN ??= read("vercel-oidc-token.key");
process.env.VERCEL_TOKEN ??= read("vercel-token.key");
process.env.VERCEL_TEAM_ID ??= read("vercel-team-id.key");
process.env.VERCEL_PROJECT_ID ??= read("vercel-project-id.key");

const failingVerify = (provider: ProviderName) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const sandboxes = yield* SandboxProvider;
      const sandbox = yield* sandboxes.open({
        autoStopMinutes: 10,
        provider,
        workspace: "/tmp/anpord-task",
      });

      yield* sandbox.writeFile("/tmp/anpord-task/total.mjs", BROKEN_SOURCE);
      yield* sandbox.writeFile("/tmp/anpord-task/total.test.mjs", TEST_SOURCE);

      return Chunk.toReadonlyArray(
        yield* Stream.runCollect(sandbox.exec(VERIFY_COMMAND))
      );
    }).pipe(Effect.scoped, Effect.provide(EvalSandboxLive))
  );

describe("a failing command keeps its own words", () => {
  /* The regression: E2B rejects on a non-zero exit and carries the output on
     the rejection's `result`. Folding the failure back after the rejection had
     already been mapped to SandboxUnavailable read that field off an error
     which never has it, so the exit code survived and the failing test's
     output did not. The journal exists to keep exactly those words. */
  const providers = [
    ["daytona", Boolean(process.env.DAYTONA_API_KEY)],
    ["e2b", Boolean(process.env.E2B_API_KEY)],
    ["upstash", Boolean(process.env.UPSTASH_BOX_API_KEY)],
    [
      "modal",
      Boolean(process.env.MODAL_TOKEN_ID && process.env.MODAL_TOKEN_SECRET),
    ],
    [
      "cloudflare",
      Boolean(
        process.env.CLOUDFLARE_SANDBOX_URL &&
          (process.env.CLOUDFLARE_SANDBOX_API_KEY ||
            process.env.CLOUDFLARE_API_TOKEN)
      ),
    ],
    [
      "vercel",
      Boolean(
        process.env.VERCEL_OIDC_TOKEN ||
          (process.env.VERCEL_TOKEN &&
            process.env.VERCEL_TEAM_ID &&
            process.env.VERCEL_PROJECT_ID)
      ),
    ],
  ] as const;

  for (const [provider, ready] of providers) {
    it.skipIf(!ready)(
      `${provider} reports the exit code and the output together`,
      async () => {
        const chunks = await failingVerify(provider);

        const exit = chunks.find((chunk) => chunk.stream === "exit");
        const output = chunks
          .filter((chunk) => chunk.stream !== "exit")
          .map((chunk) => chunk.data)
          .join("");

        expect(exit).toBeDefined();
        expect(exit?.stream === "exit" ? exit.exitCode : 0).toBe(1);
        expect(output).toContain("total sums its items");
      },
      300_000
    );
  }
});
