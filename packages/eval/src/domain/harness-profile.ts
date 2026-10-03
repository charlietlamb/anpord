import type { HarnessProfile } from "@sphynx/schema/domain/harness-profile";

export interface ProfileContent {
  readonly env: Readonly<Record<string, string>> | null;
  readonly files: Readonly<Record<string, string>>;
  readonly install: string | null;
  readonly run: string | null;
  readonly systemPrompt: string | null;
  readonly variables: readonly string[] | null;
}

/* Its row, internal id, and version exist only once the start has registered it. */
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
        variables: profile.variables ?? null,
      };
