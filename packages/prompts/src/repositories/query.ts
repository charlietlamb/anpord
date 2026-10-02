import { tryStoreWith } from "@sphynx/db/query";
import { PromptStoreError } from "../domain/errors";

export const tryStore = tryStoreWith(PromptStoreError);
