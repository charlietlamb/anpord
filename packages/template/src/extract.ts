import { tokenMatcher } from "./syntax";

/**
 * Distinct variable names in source order, so callers can count or list them.
 *
 * Escaped braces are read here too, so a name the renderer will treat as
 * literal text is never reported as a variable the editor should draw.
 */
export function extractVariables(template: string): string[] {
  const names: string[] = [];

  for (const [, open, close, name] of template.matchAll(tokenMatcher())) {
    if (open === undefined && close === undefined && name !== undefined) {
      names.push(name);
    }
  }

  return [...new Set(names)];
}
