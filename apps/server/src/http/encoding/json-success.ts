import {
  type HttpApiEndpoint,
  HttpApiSchema,
  HttpServerResponse,
} from "@effect/platform";
import { Effect, Option, type Schema } from "effect";
import { schemaEncoder } from "./schema-encoder";

type Respond = (value: unknown) => Effect.Effect<unknown>;

const unchanged: Respond = Effect.succeed;

const singleJsonSchema = (
  endpoint: HttpApiEndpoint.HttpApiEndpoint.AnyWithProps
) => {
  const schemas = new Set<Schema.Schema.Any>();
  HttpApiSchema.deunionize(schemas, endpoint.successSchema);
  const [schema] = schemas;
  if (
    schemas.size !== 1 ||
    schema === undefined ||
    HttpApiSchema.isVoid(schema.ast) ||
    HttpApiSchema.getEncoding(schema.ast).kind !== "Json"
  ) {
    return Option.none();
  }
  return Option.some(schema);
};

export const jsonSuccess = (
  endpoint: HttpApiEndpoint.HttpApiEndpoint.AnyWithProps | undefined
): Respond => {
  const schema =
    endpoint === undefined ? Option.none() : singleJsonSchema(endpoint);
  if (Option.isNone(schema)) {
    return unchanged;
  }
  const encode = schemaEncoder(schema.value);
  const options = {
    contentType: HttpApiSchema.getEncoding(schema.value.ast).contentType,
    status: HttpApiSchema.getStatusSuccessAST(schema.value.ast),
  };

  return (value) => {
    if (HttpServerResponse.isServerResponse(value)) {
      return Effect.succeed(value);
    }
    return Option.match(encode(value), {
      onNone: () => Effect.succeed(value),
      onSome: (encoded) =>
        HttpServerResponse.json(encoded, options).pipe(
          Effect.orElseSucceed(() => value)
        ),
    });
  };
};
