import type { RequestedProfile } from "../domain/harness-profile";

export interface ProfileEnv {
  readonly driverEnv: Readonly<Record<string, string>>;
  readonly forwarded: Readonly<Record<string, string>>;
  readonly home: string;
  readonly model: string;
  readonly profile: RequestedProfile | null;
  readonly workspace: string;
}

/* Precedence, lowest first: the driver's prepare, what the machine forwarded
   with the variables the profile named, then the profile's own literal env. */
export const profileEnv = (
  input: ProfileEnv
): Readonly<Record<string, string>> =>
  input.profile == null
    ? { ...input.driverEnv, ...input.forwarded }
    : {
        ...input.driverEnv,
        SPHYNX_HOME: input.home,
        SPHYNX_MODEL: input.model,
        SPHYNX_WORKSPACE: input.workspace,
        ...input.forwarded,
        ...(input.profile.env ?? {}),
      };
