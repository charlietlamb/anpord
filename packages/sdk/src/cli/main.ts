#!/usr/bin/env node
import { PROMPTS_ENABLED } from "@anpord/schema/domain/features";
import { Command } from "@effect/cli";
import { FetchHttpClient } from "@effect/platform";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Effect, Exit, Layer, Option } from "effect";
import { version } from "../../package.json";
import { commands } from "./commands";
import { EXIT_ERROR, EXIT_INTERRUPTED, reportFailure } from "./failure";

const anpord = Command.make("anpord").pipe(
  Command.withDescription(
    PROMPTS_ENABLED
      ? "Run evals and manage prompts from the terminal"
      : "Run evals from the terminal"
  ),
  Command.withSubcommands(commands)
);

const exitCodeOf = (exit: Exit.Exit<unknown, unknown>) => {
  if (Exit.isSuccess(exit)) {
    return 0;
  }
  return Cause.isInterruptedOnly(exit.cause) ? EXIT_INTERRUPTED : EXIT_ERROR;
};

Command.run(anpord, {
  name: "Anpord",
  version,
})(process.argv).pipe(
  Effect.provide(Layer.mergeAll(NodeContext.layer, FetchHttpClient.layer)),
  Effect.catchAllCause((cause) =>
    Cause.isInterruptedOnly(cause)
      ? Effect.failCause(cause)
      : reportFailure(
          Cause.failureOption(cause).pipe(
            Option.getOrElse(() => Cause.squash(cause))
          )
        )
  ),
  NodeRuntime.runMain({
    disableErrorReporting: true,
    teardown: (exit, onExit) => onExit(exitCodeOf(exit)),
  })
);
