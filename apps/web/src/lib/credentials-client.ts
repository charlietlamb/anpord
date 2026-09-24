import {
  type CreateCredentialConnection,
  CredentialConnection,
  CredentialIntegration,
  DeviceAuthChallenge,
  DeviceAuthStatus,
  IntegrationAwareness,
  type RotateCredentialConnection,
  type StartDeviceAuth,
} from "@anpord/schema/domain/credentials";
import { Schema } from "effect";
import { createApiClient } from "@/lib/api-client";

const api = createApiClient("/api/evals/credentials");

export const credentialsClient = {
  awareness: () =>
    api.request(Schema.Array(IntegrationAwareness), "/awareness"),
  create: (input: CreateCredentialConnection) =>
    api.request(CredentialConnection, "/connections", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  deviceStatus: (id: string) =>
    api.request(DeviceAuthStatus, `/device/${encodeURIComponent(id)}`),
  integrations: () =>
    api.request(Schema.Array(CredentialIntegration), "/integrations"),
  list: () => api.request(Schema.Array(CredentialConnection), "/connections"),
  remove: (id: string) =>
    api.request(Schema.Void, `/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  rotate: (id: string, input: RotateCredentialConnection) =>
    api.request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/rotate`,
      { body: JSON.stringify(input), method: "POST" }
    ),
  setDefault: (id: string) =>
    api.request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/default`,
      { method: "POST" }
    ),
  startDevice: (input: StartDeviceAuth) =>
    api.request(DeviceAuthChallenge, "/device", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  verify: (id: string) =>
    api.request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/verify`,
      { method: "POST" }
    ),
} as const;
