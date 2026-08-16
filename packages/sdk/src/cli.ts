#!/usr/bin/env node
import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { commands } from "./cli/commands";
import { layer } from "./client";
import { clientOptionsConfig } from "./config";

const anpord = Command.make("anpord").pipe(Command.withSubcommands(commands));

const ClientLayer = Layer.unwrapEffect(Effect.map(clientOptionsConfig, layer));

Command.run(anpord, {
  name: "Anpord",
  version: "0.1.0",
})(process.argv).pipe(
  Effect.provide(Layer.mergeAll(ClientLayer, NodeContext.layer)),
  NodeRuntime.runMain
);
