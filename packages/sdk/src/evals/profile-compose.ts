import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

export const appendInstall = (
  profile: HarnessProfile,
  command: string
): HarnessProfile => ({
  ...profile,
  install: profile.install ? `${profile.install} && ${command}` : command,
});
