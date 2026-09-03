import type { HarnessProfile } from "@anpord/schema/domain/harness-profile";

/* Under the home directory. Written by the materialiser, read by whichever
   driver has a flag or a variable for it. */
export const SYSTEM_PROMPT_PATH = ".anpord/system-prompt.md";

/** What a profile writes into the sandbox and hands the harness. */
export interface ProfileContent {
  readonly env: Readonly<Record<string, string>> | null;
  readonly files: Readonly<Record<string, string>>;
  readonly install: string | null;
  readonly run: string | null;
  readonly systemPrompt: string | null;
}

/** A profile as an intake hands it to the grid: content under a name. Its
 * row, and so its internal id and version, exist once the start has
 * registered it. */
export interface RequestedProfile extends ProfileContent {
  readonly name: string;
}

export const profileOfRequest = (
  profile: HarnessProfile | undefined
): RequestedProfile | null =>
  profile === undefined
    ? null
    : {
        env: profile.env ?? null,
        files: profile.files,
        install: profile.install ?? null,
        name: profile.name,
        run: profile.run ?? null,
        systemPrompt: profile.systemPrompt ?? null,
      };
