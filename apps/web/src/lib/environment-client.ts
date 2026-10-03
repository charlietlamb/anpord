import {
  type AddSubscription,
  DeviceAuthChallenge,
  DeviceAuthStatus,
  type StartDeviceAuth,
  Subscription,
} from "@sphynx/schema/domain/credentials";
import {
  type AddVariables,
  EnvironmentVariable,
  type UpdateVariable,
} from "@sphynx/schema/domain/environment";
import { Schema } from "effect";
import { createApiClient } from "@/lib/api-client";

const api = createApiClient("/api/environment");

const variablePath = (id: string) => `/variables/${encodeURIComponent(id)}`;
const subscriptionPath = (id: string) =>
  `/subscriptions/${encodeURIComponent(id)}`;

export const environmentClient = {
  addSubscription: (input: AddSubscription) =>
    api.post(Subscription, "/subscriptions", input),
  addVariables: (input: AddVariables) =>
    api.post(Schema.Array(EnvironmentVariable), "/variables", input),
  chatGptStatus: (id: string) =>
    api.request(
      DeviceAuthStatus,
      `/subscriptions/chatgpt/${encodeURIComponent(id)}`
    ),
  removeSubscription: (id: string) => api.remove(subscriptionPath(id)),
  removeVariable: (id: string) => api.remove(variablePath(id)),
  startChatGpt: (input: StartDeviceAuth) =>
    api.post(DeviceAuthChallenge, "/subscriptions/chatgpt", input),
  subscriptions: () =>
    api.request(Schema.Array(Subscription), "/subscriptions"),
  updateVariable: ({
    id,
    ...input
  }: UpdateVariable & { readonly id: string }) =>
    api.patch(EnvironmentVariable, variablePath(id), input),
  variables: () => api.request(Schema.Array(EnvironmentVariable), "/variables"),
} as const;
