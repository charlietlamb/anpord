import {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { Schema } from "effect";
import { failureOf, fromWire } from "@/lib/wire";

const BASE = "/api/evals/codebase";

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
    throw await failureOf(response, "Codebase request failed");
  }

  const payload = response.status === 204 ? undefined : await response.json();

  return fromWire(schema, payload);
};

export const codebaseClient = {
  account: () => request(Schema.NullOr(SourceControlAccount), "/account"),
  connect: (installationId?: number) =>
    request(SourceControlAccount, "/connect", {
      body: JSON.stringify(
        installationId === undefined ? {} : { installationId }
      ),
      method: "POST",
    }),
  disconnect: () => request(Schema.Void, "/connect", { method: "DELETE" }),
  installUrl: () => request(Schema.Struct({ url: Schema.String }), "/install"),
  repositories: () => request(Schema.Array(Repository), "/repositories"),
};
