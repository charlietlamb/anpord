import {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { Effect, Schema } from "effect";

const BASE = "/api/evals/codebase";

const Account = Schema.NullOr(SourceControlAccount);
const Repositories = Schema.Array(Repository);

const request = async <A, I>(
  schema: Schema.Schema<A, I>,
  path: string
): Promise<A> => {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
    } | null;
    throw new Error(body?.message ?? "Codebase request failed");
  }

  return Effect.runPromise(Schema.decodeUnknown(schema)(await response.json()));
};

export const codebaseClient = {
  account: () => request(Account, "/account"),
  repositories: () => request(Repositories, "/repositories"),
};
