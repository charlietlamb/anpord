#!/usr/bin/env node
import { DEFAULT_BASE_URL, layer } from "@anpord/schema/public/client";
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Config, Effect, Layer, Option, Redacted } from "effect";
import { version } from "../../package.json";
import { clientOptionsConfig } from "../client/config";
import { commands } from "./commands";
import { reportFailure } from "./failure";

const anpord = Command.make("anpord").pipe(
  Command.withDescription("Run evals and manage prompts from the terminal"),
  Command.withSubcommands(commands)
);

/* A command that never calls the API gets a client it can hold but not use.
   `eval import` only reads a local file, and demanding an account before it
   will run turns the cheapest way into the product into the hardest; a
   command that does call the API still fails, with the key named, on the
   request rather than before the argument is parsed. */
const OFFLINE = ["import"];

const clientOptions = clientOptionsConfig.pipe(
  Config.orElse(() =>
    Config.succeed({ apiKey: Redacted.make(""), baseUrl: DEFAULT_BASE_URL })
  )
);

const ClientLayer = Layer.unwrapEffect(
  Effect.map(
    OFFLINE.some((name) => process.argv.includes(name))
      ? clientOptions
      : clientOptionsConfig,
    layer
  )
);

Command.run(anpord, {
  name: "Anpord",
  version,
})(process.argv).pipe(
  Effect.provide(
    Layer.mergeAll(ClientLayer, NodeContext.layer, FetchHttpClient.layer)
  ),
  Effect.catchAllCause((cause) =>
    Cause.isInterruptedOnly(cause)
      ? Effect.void
      : reportFailure(
          Cause.failureOption(cause).pipe(
            Option.getOrElse(() => Cause.squash(cause))
          )
        )
  ),
  NodeRuntime.runMain({ disableErrorReporting: true })
);
