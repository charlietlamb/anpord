import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Effect } from "effect";
import { decodeStandard as decodeStandardValue } from "../mock-journal";
import { ApiMockError } from "./errors";

export const decodeStandard = <Input, Output>(
  schema: StandardSchemaV1<Input, Output>,
  value: unknown
) =>
  decodeStandardValue(schema, value).pipe(
    Effect.mapError(
      () =>
        new ApiMockError({
          message: "Value does not match the declared schema",
        })
    )
  );
