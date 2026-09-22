import { createHash } from "node:crypto";
import { DEFAULT_USER_MODEL } from "@anpord/schema/domain/eval-turns";
import { EvalHarness, EvalSandbox } from "@anpord/schema/domain/evals";
import { Config, Effect, Schema } from "effect";

export const ProviderName = EvalSandbox;
export type ProviderName = typeof ProviderName.Type;

export const HarnessName = EvalHarness;
export type HarnessName = typeof HarnessName.Type;

export const CellKey = Schema.String.pipe(Schema.brand("CellKey"));
export type CellKey = typeof CellKey.Type;

/* The harness version and the profile version are compared across readings,
   never part of the key. The profile name is. */
export interface CellParts {
  readonly caseInternalId: string;
  readonly harness: HarnessName;
  readonly model: string;
  readonly profile: string | null;
  readonly provider: ProviderName;
  /* A simulated user conducts the conversation the agent is judged on, so two
     runs led by different users are not the same cell. */
  readonly userModel: string | null;
}

/* Newline-joined so SQL can recompute it: Postgres text cannot hold NUL. The
   profile name is a fourth part only when there is one and the user model a
   fifth, so a key is byte-identical whether or not either exists. */
export const cellKeyOf = (parts: CellParts): CellKey =>
  CellKey.make(
    createHash("sha256")
      .update(
        [
          parts.caseInternalId,
          parts.harness,
          parts.model,
          parts.provider,
          ...(parts.profile == null ? [] : [parts.profile]),
          ...(parts.userModel == null ? [] : [parts.userModel]),
        ].join("\n")
      )
      .digest("hex")
      .slice(0, 32)
  );

/* Only a simulated user enters the key: a scripted one is fixed text the case
   already states, so it changes the case rather than who conducted it. */
/* withDefault means this cannot fail, so callers keep their error channels. */
export const userModel = Config.string("ANPORD_USER_MODEL").pipe(
  Config.withDefault(DEFAULT_USER_MODEL),
  Effect.orDie
);

export const userModelOf = (
  user: { readonly kind: string } | null | undefined,
  model: string
): string | null => (user?.kind === "simulated" ? model : null);
