import { apiKey } from "@better-auth/api-key";
import { API_KEY_PREFIX } from "./api-key-prefix";

const IDENTIFIABLE_PREFIX_LENGTH = 8;
const RATE_LIMIT_MAX_REQUESTS = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;

export const apiKeyPlugin = () =>
  apiKey({
    defaultPrefix: API_KEY_PREFIX,
    deferUpdates: true,
    enableMetadata: true,
    references: "organization",
    rateLimit: {
      enabled: true,
      maxRequests: RATE_LIMIT_MAX_REQUESTS,
      timeWindow: RATE_LIMIT_WINDOW_MS,
    },
    startingCharactersConfig: {
      charactersLength: IDENTIFIABLE_PREFIX_LENGTH,
      shouldStore: true,
    },
  });
