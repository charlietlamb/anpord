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

/* Only an env credential is a bare map of variables; other kinds carry their
   material in files a driver has already written. */
const credentialValues = (
  credential: Redacted.Redacted<ResolvedCredential>
) => {
  const resolved = Redacted.value(credential);

  return resolved.integrationId === "env" ? resolved.values : {};
};

/* Precedence, lowest first: the driver's prepare, the profile's own variables,
   then the env credential the run was bound to. */
export const profileEnv = (
  input: ProfileEnv
): Readonly<Record<string, string>> =>
  input.profile == null
    ? input.driverEnv
    : {
        ...input.driverEnv,
        ANPORD_HOME: input.home,
        ANPORD_MODEL: input.model,
        ANPORD_WORKSPACE: input.workspace,
        ...(input.profile.env ?? {}),
        ...credentialValues(input.credential),
      };
