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
import { fromWire } from "@/lib/wire";

const BASE = "/api/evals/credentials";

const request = async <A, I>(
  schema: Schema.Schema<A, I>,
  path: string,
  init?: RequestInit
): Promise<A> => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Credential request failed");
  }
  const payload = response.status === 204 ? undefined : await response.json();
  return fromWire(schema, payload);
};

export const credentialsClient = {
  awareness: () => request(Schema.Array(IntegrationAwareness), "/awareness"),
  create: (input: CreateCredentialConnection) =>
    request(CredentialConnection, "/connections", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  deviceStatus: (id: string) =>
    request(DeviceAuthStatus, `/device/${encodeURIComponent(id)}`),
  integrations: () =>
    request(Schema.Array(CredentialIntegration), "/integrations"),
  list: () => request(Schema.Array(CredentialConnection), "/connections"),
  remove: (id: string) =>
    request(Schema.Void, `/connections/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
  rotate: (id: string, input: RotateCredentialConnection) =>
    request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/rotate`,
      { body: JSON.stringify(input), method: "POST" }
    ),
  setDefault: (id: string) =>
    request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/default`,
      { method: "POST" }
    ),
  startDevice: (input: StartDeviceAuth) =>
    request(DeviceAuthChallenge, "/device", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  verify: (id: string) =>
    request(
      CredentialConnection,
      `/connections/${encodeURIComponent(id)}/verify`,
      { method: "POST" }
    ),
} as const;
