import type {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { failureOf, fromWire } from "@/lib/wire";

const BASE = "/api/evals/codebase";

const request = async <A>(path: string, init?: RequestInit): Promise<A> => {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    throw await failureOf(response, "Codebase request failed");
  }

  const payload = response.status === 204 ? undefined : await response.json();

  return fromWire<A>(payload);
};

export const codebaseClient = {
  account: () => request<SourceControlAccount | null>("/account"),
  connect: (installationId?: number) =>
    request<SourceControlAccount>("/connect", {
      body: JSON.stringify(
        installationId === undefined ? {} : { installationId }
      ),
      method: "POST",
    }),
  disconnect: () => request<void>("/connect", { method: "DELETE" }),
  installUrl: () => request<{ readonly url: string }>("/install"),
  repositories: () => request<readonly Repository[]>("/repositories"),
};
