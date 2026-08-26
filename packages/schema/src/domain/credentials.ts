import { Schema } from "effect";

export const CredentialScope = Schema.Literal("organization", "personal");
export type CredentialScope = typeof CredentialScope.Type;

export const CredentialStatus = Schema.Literal("active", "invalid");
export type CredentialStatus = typeof CredentialStatus.Type;

export const CredentialField = Schema.Struct({
  /** The shape of the value, shown as a placeholder beside the label. Absent
   * where the label already says it, as a bare API key does. */
  hint: Schema.optional(Schema.String),
  label: Schema.String,
  name: Schema.String,
  required: Schema.Boolean,
  secret: Schema.Boolean,
});
export type CredentialField = typeof CredentialField.Type;

export const CredentialAuthMethod = Schema.Struct({
  fields: Schema.Array(CredentialField),
  id: Schema.String,
  kind: Schema.Literal("secret", "device"),
  label: Schema.String,
});
export type CredentialAuthMethod = typeof CredentialAuthMethod.Type;

export const CredentialIntegration = Schema.Struct({
  authMethods: Schema.Array(CredentialAuthMethod),
  category: Schema.Literal("harness", "sandbox"),
  id: Schema.String,
  label: Schema.String,
});
export type CredentialIntegration = typeof CredentialIntegration.Type;

export const CredentialConnection = Schema.Struct({
  authMethodId: Schema.String,
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  integrationId: Schema.String,
  isDefault: Schema.Boolean,
  lastUsedAt: Schema.NullOr(Schema.DateTimeUtc),
  lastVerifiedAt: Schema.NullOr(Schema.DateTimeUtc),
  name: Schema.String,
  scope: CredentialScope,
  status: CredentialStatus,
});
export type CredentialConnection = typeof CredentialConnection.Type;

export const CredentialValues = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});
export type CredentialValues = typeof CredentialValues.Type;

export const ResolvedCredential = Schema.Struct({
  authMethodId: Schema.String,
  connectionId: Schema.String,
  integrationId: Schema.String,
  revision: Schema.Int,
  values: CredentialValues,
});
export type ResolvedCredential = typeof ResolvedCredential.Type;

export const CreateCredentialConnection = Schema.Struct({
  authMethodId: Schema.String,
  integrationId: Schema.String,
  isDefault: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  scope: CredentialScope,
  values: CredentialValues,
});
export type CreateCredentialConnection = typeof CreateCredentialConnection.Type;

export const CredentialBindings = Schema.Struct({
  harnessConnectionId: Schema.optional(Schema.String),
  sandboxConnectionId: Schema.optional(Schema.String),
});
export type CredentialBindings = typeof CredentialBindings.Type;

export const CredentialSelections = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});
export type CredentialSelections = typeof CredentialSelections.Type;

export const RotateCredentialConnection = Schema.Struct({
  values: CredentialValues,
});
export type RotateCredentialConnection = typeof RotateCredentialConnection.Type;

export const StartDeviceAuth = Schema.Struct({
  integrationId: Schema.Literal("codex"),
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(80)),
  scope: CredentialScope,
});
export type StartDeviceAuth = typeof StartDeviceAuth.Type;

export const DeviceAuthChallenge = Schema.Struct({
  attemptId: Schema.String,
  code: Schema.String,
  expiresAt: Schema.DateTimeUtc,
  verificationUrl: Schema.String,
});
export type DeviceAuthChallenge = typeof DeviceAuthChallenge.Type;

export const DeviceAuthStatus = Schema.Struct({
  connectionId: Schema.NullOr(Schema.String),
  status: Schema.Literal("pending", "complete", "failed", "expired"),
});
export type DeviceAuthStatus = typeof DeviceAuthStatus.Type;
