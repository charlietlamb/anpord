import type { ResolvedCredential } from "@anpord/schema/domain/credentials";

/**
 * The model a harness should be asked for, given the credential it will use.
 *
 * Codex signs in two ways and they do not offer the same thing. An api key
 * reaches the platform, where naming a model is how you choose one. A ChatGPT
 * account reaches the subscription, which picks the model itself and refuses
 * anything named: every name tried against a real account was answered with
 * "not supported when using Codex with a ChatGPT account", and omitting the
 * flag completed the turn.
 *
 * Empty means "whatever the credential chooses", which the harness turns into
 * an absent flag rather than an empty one.
 */
export const modelFor = (credential: ResolvedCredential, model: string) =>
  credential.authMethodId === "chatgpt" ? "" : model;

/* An alias like `opus` is one segment of the id the harness resolves it to. */
export const reportsModel = (requested: string, reported: string) =>
  reported === requested || reported.split("-").includes(requested);
