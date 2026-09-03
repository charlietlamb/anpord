import { CredentialValues } from "@anpord/schema/domain/credentials";
import { Effect, Redacted, Schema } from "effect";
import type { CredentialCipherShape } from "./cipher";
import { CredentialError } from "./errors";

interface SealContext {
  readonly id: string;
  readonly integrationId: string;
  readonly organizationId: string;
}

interface SealedRow extends SealContext {
  readonly sealedPayload: string;
}

const contextOf = (row: SealContext) =>
  `${row.organizationId}\0${row.id}\0${row.integrationId}`;

export const sealValues = (
  cipher: CredentialCipherShape,
  values: Readonly<Record<string, string>>,
  row: SealContext
) => cipher.seal(Redacted.make(JSON.stringify(values)), contextOf(row));

const decodeValues = (payload: Redacted.Redacted<string>) =>
  Schema.decodeUnknown(Schema.parseJson(CredentialValues))(
    Redacted.value(payload)
  ).pipe(
    Effect.map(Redacted.make),
    Effect.mapError(
      () => new CredentialError({ message: "Credential payload is invalid" })
    )
  );

export const openValues = (cipher: CredentialCipherShape, row: SealedRow) =>
  cipher
    .open(row.sealedPayload, contextOf(row))
    .pipe(Effect.flatMap(decodeValues));
