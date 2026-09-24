import { Schema } from "effect";

export const fromWire = <A, I>(
  schema: Schema.Schema<A, I>,
  payload: unknown
): A => Schema.decodeUnknownSync(schema)(payload);
