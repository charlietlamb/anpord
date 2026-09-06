import { Effect } from "effect";
import { parseDocument } from "yaml";

/* A document can parse into a value while still carrying errors, so they are
   read rather than the throw relied on. */
export const parseYamlDocument = (
  body: string
): Effect.Effect<unknown, string> =>
  Effect.try({
    catch: (cause) => (cause instanceof Error ? cause.message : String(cause)),
    try: () => {
      const document = parseDocument(body, { prettyErrors: false });
      const [failure] = document.errors;

      if (failure !== undefined) {
        throw new Error(failure.message);
      }

      const value: unknown = document.toJS();
      return value;
    },
  });
