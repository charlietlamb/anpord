import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { FetchHttpClient } from "@effect/platform";
import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import { DEFAULT_MAX_TURNS } from "@sphynx/schema/domain/eval-limits";
import { EvalSimulatedUser } from "@sphynx/schema/domain/eval-turns";
import type {
  HarnessEvent,
  HarnessUsage,
} from "@sphynx/schema/domain/harness-event";
import {
  ConfigProvider,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  Stream,
} from "effect";
import { makeLocalAdapter } from "../../../src/adapters/sandbox/local";
import { SimulatedUserLive } from "../../../src/adapters/user/layer";
import { connectionNotFound } from "../../../src/credentials/errors";
import { CredentialResolver } from "../../../src/credentials/resolver";
import type { ResumeSupport } from "../../../src/domain/usage-tally";
import { Harnesses, type RunHarness } from "../../../src/ports/harness";
import { SandboxProvider } from "../../../src/ports/sandbox";
import type { UserContext } from "../../../src/ports/simulated-user";
import { converse } from "../../../src/services/conversation";
import { HarnessVersions } from "../../../src/services/harness-versions";
import { declinesEverything } from "../../fixtures/declines-everything";
import "../../fixtures/local-root";

const OWN_WORKSPACE = /^\/tmp\/sphynx-user-[0-9a-f]+$/;

const credentialOf = (integrationId: string, connectionId: string) =>
  Redacted.make<ResolvedCredential>({
    authMethodId: "chatgpt",
    connectionId,
    integrationId,
    revision: 1,
    values: {},
  });

const context: UserContext = {
  autoStopMinutes: 5,
  harnessCredential: credentialOf("codex", "trial-codex"),
  organizationId: "org_user",
  provider: "local",
};

const said = (text: string, session: string): HarnessEvent[] => [
  { _tag: "Started", at: 0, model: "m", sessionId: session },
  { _tag: "Message", at: 1, role: "assistant", text },
];

interface Seen {
  readonly log: string[];
  readonly prepared: string[];
  readonly runs: RunHarness[];
}

interface Driver {
  readonly resume: ResumeSupport;
  readonly usages: readonly HarnessUsage[];
}

const usageOf = (input: number, output: number): HarnessUsage => ({
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
  inputTokens: input,
  outputTokens: output,
  totalTokens: input + output,
});

const perRun: Driver = { resume: "usage-per-run", usages: [] };

const recordedSandbox = (seen: Seen) =>
  Layer.succeed(SandboxProvider, {
    attach: () => Effect.die("not attached here"),
    destroy: () => Effect.void,
    open: (request) =>
      Effect.acquireRelease(
        Effect.sync(() => {
          seen.log.push(`open ${request.workspace}`);
          return {
            ...declinesEverything,
            exec: () => Stream.empty,
            home: "/home/user",
            id: "sbx-user",
            provider: "local" as const,
            writeFile: () => Effect.void,
          };
        }),
        () => Effect.sync(() => seen.log.push("close"))
      ),
  });

const onThisMachine = Layer.effect(
  SandboxProvider,
  Effect.map(makeLocalAdapter, (adapter) =>
    SandboxProvider.of({
      attach: () => Effect.die("not attached here"),
      destroy: () => Effect.void,
      open: (request) =>
        Effect.acquireRelease(adapter.open(request), (handle) =>
          Effect.orDie(adapter.destroy(handle))
        ),
    })
  )
).pipe(
  Layer.provide(
    Layer.setConfigProvider(
      ConfigProvider.fromMap(new Map([["SPHYNX_LOCAL_SANDBOX", "true"]])).pipe(
        ConfigProvider.orElse(ConfigProvider.fromEnv)
      )
    )
  )
);

const stack = (
  seen: Seen,
  userSays: readonly string[],
  connections: (
    integrationId: string
  ) => ReturnType<typeof credentialOf> | null,
  driver: Driver,
  sandboxes?: Layer.Layer<SandboxProvider>
) =>
  SimulatedUserLive.pipe(
    Layer.provide(
      Layer.mergeAll(
        FetchHttpClient.layer,
        Layer.succeed(HarnessVersions, {
          version: () => Effect.succeed("9.9.9"),
        }),
        Layer.succeed(CredentialResolver, {
          persist: () => Effect.void,
          resolve: ({ integrationId }) => {
            const found = connections(integrationId);
            return found === null
              ? Effect.fail(connectionNotFound())
              : Effect.succeed(found);
          },
          resolveBound: () => Effect.fail(connectionNotFound()),
        }),
        sandboxes ?? recordedSandbox(seen),
        Layer.succeed(Harnesses, {
          resolve: (harness) =>
            Effect.succeed({
              harness,
              prepare: (input) =>
                Effect.sync(() => {
                  seen.prepared.push(
                    Redacted.value(input.credential).connectionId
                  );
                  return {};
                }),
              resume: driver.resume,
              run: (request) =>
                Effect.sync(() => {
                  seen.runs.push(request);
                  return {
                    events: Stream.fromIterable(
                      said(userSays[seen.runs.length - 1] ?? "", "user-s")
                    ),
                    harness,
                    usage: Effect.succeed(
                      Option.fromNullable(driver.usages[seen.runs.length - 1])
                    ),
                    version: "9.9.9",
                  };
                }),
            }),
        })
      )
    )
  );

const talk = (
  user: unknown,
  seen: Seen,
  userSays: readonly string[],
  connections: (
    integrationId: string
  ) => ReturnType<typeof credentialOf> | null = () => null,
  driver: Driver = perRun,
  sandboxes?: Layer.Layer<SandboxProvider>
) => {
  const agentSays = ["What colour should it be?", "Done, it is blue."];
  let turn = 0;

  return Effect.runPromise(
    converse({
      context,
      maxTurns: DEFAULT_MAX_TURNS,
      opening: "Paint the button.",
      run: () => {
        turn += 1;
        seen.log.push(`agent turn ${turn}`);
        return Effect.succeed(said(agentSays[turn - 1] ?? "", "agent-s"));
      },
      user: Schema.decodeUnknownSync(EvalSimulatedUser)(user),
    }).pipe(
      Effect.provide(stack(seen, userSays, connections, driver, sandboxes))
    )
  );
};

const fresh = (): Seen => ({ log: [], prepared: [], runs: [] });

describe("a person played through a harness", () => {
  it("speaks through that harness, in one sandbox kept for the whole conversation", async () => {
    const seen = fresh();
    const result = await talk(
      {
        goal: "a blue button",
        harness: "codex",
        kind: "simulated",
        model: "gpt-5.6-luna",
        prompt: "The button should be blue.",
      },
      seen,
      ["It should be blue.", "<<DONE>>"]
    );

    expect(result.ended).toBe("user-done");
    expect(result.turns.map((turn) => [turn.userText, turn.agentText])).toEqual(
      [
        ["Paint the button.", "What colour should it be?"],
        ["It should be blue.", "Done, it is blue."],
      ]
    );
    expect(seen.log.filter((entry) => entry.startsWith("open"))).toHaveLength(
      1
    );
    expect(seen.log.at(-1)).toBe("close");
    expect(seen.prepared).toEqual(["trial-codex"]);
    expect(seen.runs.map((run) => [run.harness, run.model])).toEqual([
      ["codex", "gpt-5.6-luna"],
      ["codex", "gpt-5.6-luna"],
    ]);
    expect(seen.runs[1]?.prompt).toContain(
      "The agent just said:\nDone, it is blue."
    );
    expect(seen.runs[0]?.workspace).toMatch(OWN_WORKSPACE);
  });

  it("uses the organization's connection when the agent runs on another harness", async () => {
    const seen = fresh();
    await talk(
      {
        goal: "a blue button",
        harness: "claude",
        kind: "simulated",
        model: "claude-sonnet-5",
        prompt: "The button should be blue.",
      },
      seen,
      ["<<DONE>>"],
      (integrationId) =>
        integrationId === "claude" ? credentialOf("claude", "org-claude") : null
    );

    expect(seen.prepared).toEqual(["org-claude"]);
  });

  it("names the missing connection rather than scoring a silent person", async () => {
    const seen = fresh();
    const result = await talk(
      {
        goal: "a blue button",
        harness: "claude",
        kind: "simulated",
        model: "claude-sonnet-5",
        prompt: "The button should be blue.",
      },
      seen,
      []
    );

    expect(result).toMatchObject({
      ended: "no-user",
      reason: "no claude connection is configured for this organization",
    });
    expect(result.turns).toHaveLength(1);
    expect(seen.log).toEqual(["agent turn 1"]);
  });

  const codexUser = {
    goal: "a blue button",
    harness: "codex",
    kind: "simulated",
    model: "gpt-5.6-luna",
    prompt: "The button should be blue.",
  };

  it("continues its own session on later turns instead of resending the conversation", async () => {
    const seen = fresh();
    await talk(codexUser, seen, ["It should be blue.", "<<DONE>>"]);

    expect(
      seen.runs.map((run) => [Option.getOrNull(run.resume), run.prompt])
    ).toEqual([
      [null, expect.stringContaining("Your goal: a blue button")],
      ["user-s", "The agent just said:\nDone, it is blue."],
    ]);
  });

  it("resends the conversation when its harness cannot continue a session", async () => {
    const seen = fresh();
    await talk(
      codexUser,
      seen,
      ["It should be blue.", "<<DONE>>"],
      () => null,
      {
        resume: "unsupported",
        usages: [],
      }
    );

    expect(seen.runs.map((run) => Option.getOrNull(run.resume))).toEqual([
      null,
      null,
    ]);
    expect(seen.runs[1]?.prompt).toContain(
      "What you have said so far, oldest first:\n- Paint the button.\n- It should be blue."
    );
  });

  it("adds up what each run spent when every run reports only itself", async () => {
    const result = await talk(
      codexUser,
      fresh(),
      ["It should be blue.", "<<DONE>>"],
      () => null,
      { resume: "usage-per-run", usages: [usageOf(100, 10), usageOf(40, 5)] }
    );

    expect(result.userSpend).toEqual(
      Option.some({ model: "gpt-5.6-luna", usage: usageOf(140, 15) })
    );
  });

  it("keeps the last total when a resumed run reports the whole session", async () => {
    const result = await talk(
      codexUser,
      fresh(),
      ["It should be blue.", "<<DONE>>"],
      () => null,
      {
        resume: "usage-per-session",
        usages: [usageOf(100, 10), usageOf(160, 18)],
      }
    );

    expect(result.userSpend).toEqual(
      Option.some({ model: "gpt-5.6-luna", usage: usageOf(160, 18) })
    );
  });

  it("leaves no workspace behind on the machine that played the person", async () => {
    const seen = fresh();
    await talk(
      codexUser,
      seen,
      ["<<DONE>>"],
      () => null,
      perRun,
      onThisMachine
    );

    const workspace = seen.runs[0]?.workspace ?? "";
    expect([OWN_WORKSPACE.test(workspace), existsSync(workspace)]).toEqual([
      true,
      false,
    ]);
  });
});
