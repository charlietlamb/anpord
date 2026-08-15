const VARIABLE_NAME = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Distinct variable names in source order, so callers can count or list them. */
export function extractVariables(value: string): string[] {
  const found = value.matchAll(VARIABLE_NAME);
  return [...new Set([...found].map((match) => match[1]))];
}
