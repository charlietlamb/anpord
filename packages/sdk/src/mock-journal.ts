import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Effect } from "effect";

export const errorOf = (cause: unknown) =>
  cause instanceof Error ? cause : new Error(String(cause));

export const decodeStandard = <Input, Output>(
  schema: StandardSchemaV1<Input, Output>,
  value: unknown
) =>
  Effect.tryPromise({
    catch: errorOf,
    try: async () => {
      const result = await schema["~standard"].validate(value);

      if (result.issues !== undefined) {
        throw new Error(result.issues.map(({ message }) => message).join("; "));
      }

      return result.value;
    },
  });

export const appendCall = (path: string, call: unknown) =>
  Effect.tryPromise({
    catch: errorOf,
    try: async () => {
      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, `${JSON.stringify(call)}\n`);
    },
  });
