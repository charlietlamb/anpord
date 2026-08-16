#!/usr/bin/env node
import { layer } from "@anpord/schema/public/client";
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Layer, Option } from "effect";
import { clientOptionsConfig } from "../client/config";
import { commands } from "./commands";
import { reportFailure } from "./failure";

const anpord = Command.make("anpord").pipe(
  Command.withDescription("Read and publish prompts from the terminal"),
  Command.withSubcommands(commands)
);

const ClientLayer = Layer.unwrapEffect(Effect.map(clientOptionsConfig, layer));

Command.run(anpord, {
  name: "Anpord",
  version: "0.1.0",
})(process.argv).pipe(
  Effect.provide(Layer.mergeAll(ClientLayer, NodeContext.layer)),
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
