import { Effect } from "effect";
import { parseDocument } from "yaml";

/** A YAML document can parse into a value while still carrying errors the
 * author needs to see, so the errors are read rather than the throw relied on.
 * The value is returned as `unknown` because the schema, not the parser,
 * decides what shape it has. */
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
