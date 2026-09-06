import { tokenMatcher } from "./syntax";

/** Reads escapes too, so text the renderer leaves literal is never reported as
 * a variable. */
export function extractVariables(template: string): string[] {
  const names: string[] = [];

  for (const [, open, close, name] of template.matchAll(tokenMatcher())) {
    if (open === undefined && close === undefined && name !== undefined) {
      names.push(name);
    }
  }

  return [...new Set(names)];
}
