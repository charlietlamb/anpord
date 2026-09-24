import { DEFAULT_USER_MODEL } from "@anpord/schema/domain/eval-turns";
import type { EvalUser } from "@anpord/schema/domain/eval-turns";
import { EvalHarness, EvalSandbox } from "@anpord/schema/domain/evals";
import { Config, Effect, Option, Schema } from "effect";
import type { HarnessName, ProviderName } from "./cell";

export interface VariantIdentity {
  readonly harness: HarnessName;
  readonly model: string;
  readonly profile: string | null;
  readonly sandbox: ProviderName;
  readonly userModel: string | null;
}

export const userModel = Config.string("ANPORD_USER_MODEL").pipe(
  Config.withDefault(DEFAULT_USER_MODEL),
  Effect.orDie
);

export const userModelOf = (
  user: EvalUser | null | undefined,
  model: string
): string | null => (user?.kind === "simulated" ? model : null);

const harnessOf = Schema.decodeUnknownOption(EvalHarness);
const sandboxOf = Schema.decodeUnknownOption(EvalSandbox);

export const namesOf = (row: {
  readonly harness: string;
  readonly sandbox: string;
}) =>
  Option.all({ harness: harnessOf(row.harness), sandbox: sandboxOf(row.sandbox) });
