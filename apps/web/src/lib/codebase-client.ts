import {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { Effect, Schema } from "effect";

const BASE = "/api/evals/codebase";

const Account = Schema.NullOr(SourceControlAccount);
const Repositories = Schema.Array(Repository);
const InstallUrl = Schema.Struct({ url: Schema.String });

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
    throw new Error(body?.message ?? "Codebase request failed");
  }

  const payload = response.status === 204 ? undefined : await response.json();

  return Effect.runPromise(Schema.decodeUnknown(schema)(payload));
};

export const codebaseClient = {
  account: () => request(Account, "/account"),
  connect: (installationId: number) =>
    request(SourceControlAccount, "/connect", {
      body: JSON.stringify({ installationId }),
      method: "POST",
    }),
  disconnect: () => request(Schema.Void, "/connect", { method: "DELETE" }),
  installUrl: () => request(InstallUrl, "/install"),
  repositories: () => request(Repositories, "/repositories"),
};
