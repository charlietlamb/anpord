import { tryStoreWith } from "@anpord/db/query";
import { PromptStoreError } from "../domain/errors";

export const tryStore = tryStoreWith(PromptStoreError);
