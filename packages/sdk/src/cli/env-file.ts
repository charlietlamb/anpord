export interface EnvFileEntry {
  readonly name: string;
  readonly value: string;
}

const INLINE_COMMENT = /\s#/;
const NEWLINE = /\r?\n/;
const LINE = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

const unquoted = (raw: string) => {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  const comment = trimmed.search(INLINE_COMMENT);
  return comment === -1 ? trimmed : trimmed.slice(0, comment).trimEnd();
};

export const parseEnvFile = (text: string): readonly EnvFileEntry[] =>
  text.split(NEWLINE).flatMap((line) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return [];
    }
    const match = LINE.exec(trimmed);
    if (match === null) {
      return [];
    }
    const [, name = "", raw = ""] = match;
    const value = unquoted(raw);
    return value === "" ? [] : [{ name, value }];
  });
