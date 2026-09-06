import type { StandardSchemaV1 } from "@standard-schema/spec";
import { Schema } from "effect";

type Responses = Readonly<Record<number, StandardSchemaV1>>;
type ResponseOf<R extends Responses> = {
  [Status in keyof R & number]: {
    readonly status: Status;
    readonly body: StandardSchemaV1.InferInput<R[Status]>;
    readonly headers?: Readonly<Record<string, string>>;
  };
}[keyof R & number];

export interface ApiHandlerContext {
  readonly log: (value: unknown) => void;
  readonly signal: AbortSignal;
}

export interface EndpointDefinition {
  readonly description?: string;
  handler(
    input: unknown,
    context: ApiHandlerContext
  ): ResponseOf<Responses> | Promise<ResponseOf<Responses>>;
  readonly inputSchema: StandardSchemaV1;
  readonly method:
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE"
    | "HEAD"
    | "OPTIONS";
  readonly path: `/${string}`;
  readonly responses: Responses;
}

type EndpointOptions<
  Input extends StandardSchemaV1,
  Output extends Responses,
  Result,
> = Omit<EndpointDefinition, "inputSchema" | "responses" | "handler"> & {
  readonly inputSchema: Input;
  readonly responses: Output;
  handler(
    input: StandardSchemaV1.InferOutput<Input>,
    context: ApiHandlerContext
  ): Result | Promise<Result>;
};

export const endpoint = <
  Input extends StandardSchemaV1,
  const Output extends Responses,
  const Result extends ResponseOf<Output>,
>(
  definition: EndpointOptions<Input, Output, Result>
): EndpointOptions<Input, Output, Result> => definition;

export interface ApiDefinition {
  readonly endpoints: readonly EndpointDefinition[];
  readonly name: string;
  readonly redact?: readonly string[];
}

const Name = Schema.String.pipe(Schema.pattern(/^[a-z][a-z0-9-]{0,63}$/));
const Path = Schema.String.pipe(
  Schema.pattern(
    /^\/(?:[A-Za-z0-9._~-]+|:[A-Za-z][A-Za-z0-9_]*)(?:\/(?:[A-Za-z0-9._~-]+|:[A-Za-z][A-Za-z0-9_]*))*\/?$|^\/$/
  )
);
const PARAMETER = /:[A-Za-z][A-Za-z0-9_]*/g;

export const api = (definition: ApiDefinition): ApiDefinition => {
  Schema.decodeUnknownSync(Name)(definition.name);
  const routes = new Set<string>();
  for (const route of definition.endpoints) {
    Schema.decodeUnknownSync(Path)(route.path);
    const key = `${route.method} ${route.path.replace(PARAMETER, ":parameter")}`;
    if (routes.has(key)) {
      throw new Error(`Duplicate API endpoint: ${key}`);
    }
    routes.add(key);
    if (Object.keys(route.responses).length === 0) {
      throw new Error(`API endpoint needs response schemas: ${key}`);
    }
    for (const status of Object.keys(route.responses)) {
      Schema.decodeUnknownSync(Schema.Int.pipe(Schema.between(200, 599)))(
        Number(status)
      );
    }
  }
  return definition;
};
