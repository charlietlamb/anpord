import { tryStoreWith } from "@anpord/db/query";
import { EvalStoreError } from "../domain/errors";

export const tryStore = tryStoreWith(EvalStoreError);
