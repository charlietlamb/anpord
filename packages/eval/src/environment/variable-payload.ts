import { Effect, Redacted } from "effect";
import type { CredentialCipherShape } from "../credentials/cipher";

interface SealContext {
  readonly id: string;
  readonly name: string;
  readonly organizationId: string;
}

interface SealedVariable extends SealContext {
  readonly sealedValue: string;
}

const contextOf = (row: SealContext) =>
  `${row.organizationId}\0${row.id}\0variable\0${row.name}`;

export const sealVariable = (
  cipher: CredentialCipherShape,
  value: string,
  row: SealContext
) => cipher.seal(Redacted.make(value), contextOf(row));

export const openVariable = (
  cipher: CredentialCipherShape,
  row: SealedVariable
) =>
  cipher
    .open(row.sealedValue, contextOf(row))
    .pipe(Effect.withSpan("Variables.open"));
