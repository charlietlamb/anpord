import type { ResolvedCredential } from "@anpord/schema/domain/credentials";
import { Redacted } from "effect";
import type { RequestedProfile } from "../domain/harness-profile";

export interface ProfileEnv {
  readonly credential: Redacted.Redacted<ResolvedCredential>;
  readonly driverEnv: Readonly<Record<string, string>>;
  readonly home: string;
  readonly model: string;
  readonly profile: RequestedProfile | null;
  readonly workspace: string;
}

/* An env credential is a bare map of variables, so the harness a profile runs
   on reads its provider key from the sandbox environment. Any other kind
   carries its material in files a driver has already written. */
const credentialValues = (
  credential: Redacted.Redacted<ResolvedCredential>
) => {
  const resolved = Redacted.value(credential);

  return resolved.integrationId === "env" ? resolved.values : {};
};

/**
 * The environment the harness runs under.
 *
 * A profile's own scripts find the sandbox on any base through `ANPORD_*`, its
 * declared variables override what the driver's prepare returned, and the env
 * credential's keys win over both: it is the material the run was bound to.
 */
export const profileEnv = (
  input: ProfileEnv
): Readonly<Record<string, string>> =>
  input.profile === null
    ? input.driverEnv
    : {
        ...input.driverEnv,
        ANPORD_HOME: input.home,
        ANPORD_MODEL: input.model,
        ANPORD_WORKSPACE: input.workspace,
        ...(input.profile.env ?? {}),
        ...credentialValues(input.credential),
      };
