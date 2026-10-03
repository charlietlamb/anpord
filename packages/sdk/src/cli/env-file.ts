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
  if (quote === '"' || quote === "'") {
    const closing = trimmed.indexOf(quote, 1);
    if (closing !== -1) {
      return trimmed.slice(1, closing);
    }
  }
  const comment = trimmed.search(INLINE_COMMENT);
  return comment === -1 ? trimmed : trimmed.slice(0, comment).trimEnd();
};

export const parseEnvFile = (text: string): readonly EnvFileEntry[] => {
  const entries = new Map<string, string>();
  for (const line of text.split(NEWLINE)) {
    const trimmed = line.trim();
    const match = trimmed.startsWith("#") ? null : LINE.exec(trimmed);
    const [, name = "", raw = ""] = match ?? [];
    const value = unquoted(raw);
    if (name !== "" && value !== "") {
      entries.delete(name);
      entries.set(name, value);
    }
  }
  return [...entries].map(([name, value]) => ({ name, value }));
};
