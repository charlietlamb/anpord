import { apiKey } from "@better-auth/api-key";
import { API_KEY_PREFIX } from "./api-key-prefix";

const IDENTIFIABLE_PREFIX_LENGTH = 8;

export const apiKeyPlugin = () =>
  apiKey({
    defaultPrefix: API_KEY_PREFIX,
    enableMetadata: true,
    /** A key acts for an organisation rather than the person who minted it, so
     * it keeps working when they leave. The schema's reference_id points at
     * organization, and the default of "user" writes an id that column will
     * not accept. */
    references: "organization",
    startingCharactersConfig: {
      charactersLength: IDENTIFIABLE_PREFIX_LENGTH,
      shouldStore: true,
    },
  });
