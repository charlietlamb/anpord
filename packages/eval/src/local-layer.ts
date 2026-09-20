import { FetchHttpClient } from "@effect/platform";
import { Effect, Layer } from "effect";
import { HarnessesLive } from "./adapters/harness/resolve";
import { makeLocalAdapter } from "./adapters/sandbox/local";
import { ScorerChecksLive } from "./adapters/scorers/checks";
import { ScorerGroundTruthLive } from "./adapters/scorers/ground-truth";
import { SimulatedUserLive } from "./adapters/user/llm-user";
import { CredentialResolverFromEnv } from "./credentials/env-resolver";
import type { CredentialResolver } from "./credentials/resolver";
import { JudgeModelLive } from "./judges/layer";
import { SandboxAdapters } from "./ports/sandbox";
import { AgentTrialLive } from "./services/agent-trial";
import { HarnessVersionsLive } from "./services/harness-versions";
import { AgentTrialJudgedLive } from "./services/judged-trial";
import { LocalTrialsLive } from "./services/local-trial";
import { SandboxProviderLive } from "./services/sandbox-provider";
import { SuspenderSleeping } from "./services/suspender";

/* Only the one adapter, so nothing here reaches a cloud provider's SDK. A
   request for any other provider is a mistake this layer can name. */
const LocalAdaptersLive = Layer.effect(
  SandboxAdapters,
  Effect.map(Effect.cached(makeLocalAdapter), (local) =>
    SandboxAdapters.of({
      resolve: (provider) =>
        provider === "local"
          ? local
          : Effect.dieMessage(`a local run cannot open a ${provider} sandbox`),
    })
  )
);

/* One trial on the machine that asked for it. The grid's repositories are
   absent rather than stubbed: a local run has no cell to compare against and
   nothing to persist, so it needs no database at all. */
export const evalLocalWith = (credentials: Layer.Layer<CredentialResolver>) =>
  LocalTrialsLive.pipe(
    Layer.provide(
      AgentTrialJudgedLive.pipe(
        Layer.provide(
          AgentTrialLive.pipe(
            Layer.provide(
              ScorerChecksLive.pipe(Layer.provide(ScorerGroundTruthLive))
            ),
            Layer.provide(SuspenderSleeping),
            Layer.provide(
              SimulatedUserLive.pipe(Layer.provide(FetchHttpClient.layer))
            )
          )
        ),
        Layer.provide(
          JudgeModelLive.pipe(Layer.provide(FetchHttpClient.layer))
        ),
        Layer.provide(Layer.mergeAll(HarnessesLive, HarnessVersionsLive))
      )
    ),
    Layer.provide(credentials),
    Layer.provide(SandboxProviderLive.pipe(Layer.provide(LocalAdaptersLive))),
    Layer.provideMerge(HarnessVersionsLive)
  );

export const EvalLocalLive = evalLocalWith(CredentialResolverFromEnv);
