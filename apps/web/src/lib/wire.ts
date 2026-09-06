import { Schema } from "effect";

export const fromWire = <A, I>(
  schema: Schema.Schema<A, I>,
  payload: unknown
): A => Schema.decodeUnknownSync(schema)(payload);

export const failureOf = async (response: Response, fallback: string) => {
  const body = (await response.json().catch(() => null)) as {
    message?: string;
  } | null;

  return new Error(body?.message ?? fallback);
};
