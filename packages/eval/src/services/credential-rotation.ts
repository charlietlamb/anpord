import { Effect, Option, Redacted } from "effect";
import type { CredentialResolverShape } from "../credentials/resolver";
import type { HarnessDriverShape, PrepareHarness } from "../ports/harness";

export interface CaptureRotation extends PrepareHarness {
  readonly credentials: CredentialResolverShape;
  readonly driver: HarnessDriverShape;
  readonly organizationId: string;
}

/* Never fails the trial: a credential that could not be written back leaves
   this run correct and only the next one worse off, which is not worth losing
   a result that already cost a sandbox. */
export const captureCredentialRotation = (input: CaptureRotation) =>
  Effect.gen(function* () {
    const capture = input.driver.captureRotation;

    if (capture === undefined) {
      return;
    }

    const rotated = yield* capture(input);

    if (Option.isNone(rotated)) {
      return;
    }

    yield* input.credentials.persist({
      connectionId: Redacted.value(input.credential).connectionId,
      organizationId: input.organizationId,
      values: rotated.value,
    });

    yield* Effect.logInfo("Stored the token the harness refreshed");
  }).pipe(
    Effect.withSpan("Credentials.captureRotation"),
    Effect.annotateLogs({
      harness: input.driver.harness,
      organizationId: input.organizationId,
    }),
    Effect.ignoreLogged
  );
