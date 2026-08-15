import { type AnpordApi, layer } from "anpord/client";
import { clientOptionsConfig } from "anpord/config";
import type { ConfigError } from "effect";
import { Effect, Layer, ManagedRuntime } from "effect";

const ClientLayer: Layer.Layer<AnpordApi, ConfigError.ConfigError> =
  Layer.unwrapEffect(Effect.map(clientOptionsConfig, layer));

/**
 * One runtime for the process rather than one per tool call, so the HTTP client
 * and its connection pool are built once.
 */
const runtime = ManagedRuntime.make(ClientLayer);

export const runTool = <A, E>(effect: Effect.Effect<A, E, AnpordApi>) =>
  runtime.runPromise(effect);
