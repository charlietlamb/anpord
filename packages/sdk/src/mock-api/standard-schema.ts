import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Effect } from "effect";
import { ApiMockError } from "./errors";

export const decodeStandard = <Input, Output>(
  schema: StandardSchemaV1<Input, Output>,
  value: unknown
) =>
  Effect.tryPromise({
    try: async () => {
      const result = await schema["~standard"].validate(value);
      if (result.issues !== undefined) {
        throw new Error(result.issues.map(({ message }) => message).join("; "));
      }
      return result.value;
    },
    catch: () =>
      new ApiMockError({ message: "Value does not match the declared schema" }),
  });
