import {
  Repository,
  SourceControlAccount,
} from "@anpord/schema/domain/codebase";
import { Schema } from "effect";
import { createApiClient } from "@/lib/api-client";

const api = createApiClient("/api/evals/codebase");

export const codebaseClient = {
  account: () => api.request(Schema.NullOr(SourceControlAccount), "/account"),
  connect: (installationId?: number) =>
    api.post(
      SourceControlAccount,
      "/connect",
      installationId === undefined ? {} : { installationId }
    ),
  disconnect: () => api.request(Schema.Void, "/connect", { method: "DELETE" }),
  installUrl: () =>
    api.request(Schema.Struct({ url: Schema.String }), "/install"),
  repositories: () => api.request(Schema.Array(Repository), "/repositories"),
};
