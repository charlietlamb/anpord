export interface EnvEntry {
  readonly name: string;
  readonly value: string;
}

const EXPORT_PREFIX = /^export\s+/;
const INLINE_COMMENT = /\s+#.*$/;
const DOUBLE_ESCAPE = /\\(["\\nrt])/g;
const LINE_BREAK = /\r?\n/;
const ESCAPES: Readonly<Record<string, string>> = {
  '"': '"',
  "\\": "\\",
  n: "\n",
  r: "\r",
  t: "\t",
};

const unescapeDouble = (value: string) =>
  value.replaceAll(DOUBLE_ESCAPE, (_, char: string) => ESCAPES[char] ?? char);

const valueFrom = (raw: string) => {
  const quote = raw[0];

  if (quote === '"' || quote === "'") {
    const end = raw.lastIndexOf(quote);
    const inner = end > 0 ? raw.slice(1, end) : raw.slice(1);

    return quote === '"' ? unescapeDouble(inner) : inner;
  }

  return raw.replace(INLINE_COMMENT, "").trim();
};

const entryOf = (raw: string): EnvEntry | null => {
  const line = raw.trim().replace(EXPORT_PREFIX, "");

  if (line === "" || line.startsWith("#")) {
    return null;
  }

  const separator = line.indexOf("=");

  if (separator <= 0) {
    return null;
  }

  return {
    name: line.slice(0, separator).trim(),
    value: valueFrom(line.slice(separator + 1).trim()),
  };
};

export const parseEnvLines = (text: string): readonly EnvEntry[] =>
  text.split(LINE_BREAK).flatMap((line) => {
    const entry = entryOf(line);

    return entry === null ? [] : [entry];
  });

export const looksLikeEnv = (text: string) =>
  text.includes("\n") || text.includes("=");
