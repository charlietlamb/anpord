import { MissingVariables } from "./errors";
import { LITERAL_CLOSE, LITERAL_OPEN, tokenMatcher } from "./syntax";

/** Objects are rejected on purpose: `[object Object]` is a bug and
 * `JSON.stringify` is a guess, so the caller decides which they meant. */
export type VariableValue = string | number | boolean | null | undefined;
export type Variables = Readonly<Record<string, VariableValue>>;

/**
 * What to do with a name the template uses and the caller did not supply.
 *
 * Throwing is the default because the alternatives are silent: braces reach
 * the model, it answers anyway, and the mistake surfaces days later as
 * degraded output rather than at the call site.
 */
export type OnMissing = "throw" | "keep" | "empty";

export interface RenderOptions {
  readonly onMissing?: OnMissing;
}

export interface Rendered {
  readonly content: string;
  /** Names the template used and the caller did not supply, in source order. */
  readonly missing: readonly string[];
}

/** Null and undefined read as absent rather than as the strings "null" and
 * "undefined", because that is what `{ name: user.name }` produces when the
 * field is not there. */
const suppliedValue = (values: Variables, name: string) => {
  const value = values[name];
  return value === null || value === undefined ? undefined : String(value);
};

/**
 * Fills `{{name}}` from a flat map.
 *
 * Dots and hyphens are part of the name rather than a path: `{{user.name}}`
 * reads the key `"user.name"`. One rule beats two, and a caller who wants
 * nesting writes the flat key themselves.
 */
export function render<Name extends string = string>(
  template: string,
  values: Readonly<Record<Name, VariableValue>>,
  options: RenderOptions = {}
): Rendered {
  const onMissing = options.onMissing ?? "throw";
  const missing: string[] = [];

  const content = template.replace(
    tokenMatcher(),
    (
      match,
      open: string | undefined,
      close: string | undefined,
      name: string | undefined
    ) => {
      if (open !== undefined) {
        return LITERAL_OPEN;
      }
      if (close !== undefined) {
        return LITERAL_CLOSE;
      }
      if (name === undefined) {
        return match;
      }

      const value = suppliedValue(values as Variables, name);
      if (value !== undefined) {
        return value;
      }
      if (!missing.includes(name)) {
        missing.push(name);
      }
      return onMissing === "empty" ? "" : match;
    }
  );

  if (onMissing === "throw" && missing.length > 0) {
    throw new MissingVariables(missing);
  }

  return { content, missing };
}
