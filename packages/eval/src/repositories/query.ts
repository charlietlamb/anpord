import { tryStoreWith } from "@sphynx/db/query";
import { EvalStoreError } from "../domain/errors";

export const tryStore = tryStoreWith(EvalStoreError);
