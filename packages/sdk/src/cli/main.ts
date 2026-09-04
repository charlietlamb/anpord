#!/usr/bin/env node
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer, Option } from "effect";
import { version } from "../../package.json";
import { commands } from "./commands";
import { reportFailure } from "./failure";

const anpord = Command.make("anpord").pipe(
  Command.withDescription("Run evals and manage prompts from the terminal"),
  Command.withSubcommands(commands)
);

Command.run(anpord, {
  name: "Anpord",
  version,
})(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, FetchHttpClient.layer)),
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
