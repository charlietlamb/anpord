import { apiKey } from "@better-auth/api-key";
import { API_KEY_PREFIX } from "./api-key-prefix";

const IDENTIFIABLE_PREFIX_LENGTH = 8;

export const apiKeyPlugin = () =>
  apiKey({
    defaultPrefix: API_KEY_PREFIX,
    enableMetadata: true,
    startingCharactersConfig: {
      charactersLength: IDENTIFIABLE_PREFIX_LENGTH,
      shouldStore: true,
    },
  });
