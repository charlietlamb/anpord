import { apiKey } from "@better-auth/api-key";
import { API_KEY_PREFIX } from "./api-key-prefix";

const IDENTIFIABLE_PREFIX_LENGTH = 8;
const RATE_LIMIT_MAX_REQUESTS = 1000;
const RATE_LIMIT_WINDOW_MS = 60_000;

export const apiKeyPlugin = () =>
  apiKey({
    defaultPrefix: API_KEY_PREFIX,
    enableMetadata: true,
    /** A key acts for an organisation rather than the person who minted it, so
     * it keeps working when they leave. The schema's reference_id points at
     * organization, and the default of "user" writes an id that column will
     * not accept. */
    references: "organization",
    /** The plugin defaults to 10 requests a day, which reads as a key that
     * silently stops working. A prompt is fetched on the request path, so the
     * ceiling is set high enough to be a runaway guard rather than a quota. */
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
