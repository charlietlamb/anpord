export type ParsedEnvLines =
  | { readonly problem: string; readonly values: null }
  | {
      readonly problem: null;
      readonly values: Readonly<Record<string, string>>;
    };

const ENV_KEY = /^[A-Z_][A-Z0-9_]*$/;

const meaningful = (line: string) => line !== "" && !line.startsWith("#");

/* A bad line is named by its number, never quoted back: the text holds pasted secrets. */
export const parseEnvLines = (text: string): ParsedEnvLines => {
  const values: Record<string, string> = {};

  for (const [index, raw] of text.split("\n").entries()) {
    const line = raw.trim();

    if (!meaningful(line)) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator < 0) {
      return {
        problem: `Line ${index + 1} needs a = between name and value`,
        values: null,
      };
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!ENV_KEY.test(key)) {
      return {
        problem: `${key || "A variable"} needs an uppercase name like API_KEY`,
        values: null,
      };
    }

    if (value === "") {
      return { problem: `${key} has no value`, values: null };
    }

    values[key] = value;
  }

  return { problem: null, values };
};
