import { MissingVariables } from "./errors";
import { LITERAL_CLOSE, LITERAL_OPEN, tokenMatcher } from "./syntax";

/** Objects are rejected: `[object Object]` is a bug and `JSON.stringify` a
 * guess, so the caller decides. */
export type VariableValue = string | number | boolean | null | undefined;
export type Variables = Readonly<Record<string, VariableValue>>;

/** Throwing is the default: the alternatives let braces reach the model, which
 * answers anyway. */
export type OnMissing = "throw" | "keep" | "empty";

export interface RenderOptions {
  readonly onMissing?: OnMissing;
}

export interface Rendered {
  readonly content: string;
  /** In source order. */
  readonly missing: readonly string[];
}

/** Null and undefined read as absent, not as the strings "null"/"undefined". */
const suppliedValue = (values: Variables, name: string) => {
  const value = values[name];
  return value === null || value === undefined ? undefined : String(value);
};

/** Flat map only: `{{user.name}}` reads the key `"user.name"`, not a path. */
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
