import { Deployment } from "@anpord/schema/domain/deployments";
import { Effect, Schema } from "effect";

const BASE = "/api/deployments";

const DeploymentList = Schema.Array(Deployment);

export interface DeploymentFilters {
  readonly before?: Date;
  readonly channel?: string;
  readonly limit?: number;
  readonly prompt?: string;
}

const query = (filters: DeploymentFilters) => {
  const params = new URLSearchParams();

  if (filters.channel !== undefined) {
    params.set("channel", filters.channel);
  }
  if (filters.prompt !== undefined) {
    params.set("prompt", filters.prompt);
  }
  if (filters.before !== undefined) {
    params.set("before", filters.before.toISOString());
  }
  if (filters.limit !== undefined) {
    params.set("limit", String(filters.limit));
  }

  const search = params.toString();
  return search === "" ? "" : `?${search}`;
};

export const listDeployments = async (
  filters: DeploymentFilters = {}
): Promise<readonly Deployment[]> => {
  const response = await fetch(`${BASE}${query(filters)}`, {
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with ${response.status}`);
  }

  const payload = await response.json();
  return Effect.runPromise(Schema.decodeUnknown(DeploymentList)(payload));
};
