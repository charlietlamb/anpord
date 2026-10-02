import type { ResolvedCredential } from "@sphynx/schema/domain/credentials";
import { Effect, Either, Option, Redacted } from "effect";
import { HarnessUnavailable } from "../../domain/errors";
import type { ResumeSupport } from "../../domain/usage-tally";
import type { HarnessName } from "../../domain/variant";
import type {
  HarnessDriverShape,
  PrepareHarness,
  RunHarness,
} from "../../ports/harness";
import { type InstallPlan, installHarness } from "./install";
import { jsonSession, type LineDecoder } from "./session";

type Values = Readonly<Record<string, string>>;

export interface Material {
  readonly env: Values;
  readonly files?: Values;
}

export interface HarnessRow {
  readonly captureRotation?: HarnessDriverShape["captureRotation"];
  readonly command: (request: RunHarness) => string;
  readonly decode: LineDecoder;
  readonly install: InstallPlan;
  readonly material: (
    credential: ResolvedCredential
  ) => Either.Either<Material, string>;
  readonly resume?: ResumeSupport;
  readonly runEnv?: (request: RunHarness) => Values;
  readonly verifyModel?: boolean;
}

export const field = (credential: ResolvedCredential, name: string) =>
  Either.fromNullable(
    credential.values[name] || undefined,
    () => `Credential field ${name} is missing`
  );

export const keyAs =
  (variable: string, name = "apiKey") =>
  (credential: ResolvedCredential) =>
    Either.map(field(credential, name), (value) => ({
      env: { [variable]: value },
    }));

const spanName = (harness: HarnessName) =>
  `${harness.charAt(0).toUpperCase()}${harness.slice(1)}`;

const credentialOf = (harness: HarnessName, input: PrepareHarness) => {
  const credential = Redacted.value(input.credential);

  return credential.integrationId === harness ||
    credential.integrationId === "env"
    ? Either.right(credential)
    : Either.left("Credential integration does not match harness");
};

export const jsonDriver = (
  harness: HarnessName,
  row: HarnessRow
): HarnessDriverShape => {
  const name = spanName(harness);
  const unavailable = (cause: { readonly reason: string } | string) =>
    new HarnessUnavailable({
      harness,
      reason: typeof cause === "string" ? cause : cause.reason,
    });

  const resume = row.resume ?? "unsupported";

  return {
    captureRotation: row.captureRotation,
    harness,
    prepare: (input) =>
      Effect.gen(function* () {
        const credential = yield* credentialOf(harness, input);
        const material = yield* row.material(credential);

        yield* installHarness(harness, row.install, input).pipe(
          Effect.withSpan(`${name}.install`, {
            attributes: { version: input.version },
          })
        );

        yield* Effect.forEach(
          Object.entries(material.files ?? {}),
          ([path, content]) =>
            input.sandbox.writeFile(`${input.home}/${path}`, content),
          { discard: true }
        );

        return material.env;
      }).pipe(Effect.mapError(unavailable), Effect.withSpan(`${name}.prepare`)),
    resume,
    run: (request) =>
      (Option.isSome(request.resume) && resume === "unsupported"
        ? Effect.fail(unavailable(`${harness} cannot continue a session`))
        : jsonSession(request, row.command(request), row.decode, {
            env: row.runEnv?.(request),
            verifyModel: row.verifyModel,
          })
      ).pipe(Effect.withSpan(`${name}.run`)),
  };
};
