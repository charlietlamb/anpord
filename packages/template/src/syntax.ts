/**
 * What a variable looks like, defined once.
 *
 * The editor's atom node, the extractor and the renderer have to agree
 * exactly: a name the editor draws as a chip but the renderer does not fill
 * reaches the model as literal braces, and nobody notices until the output is
 * wrong.
 */
export const VARIABLE_PATTERN = String.raw`\{\{\s*([\w.-]+)\s*\}\}`;

/** Doubling is the escape, so `{{{{name}}}}` emits a literal `{{name}}`.
 * Backslashes would fight both the markdown escaper and JSON string
 * literals. */
export const LITERAL_OPEN = "{{";
export const LITERAL_CLOSE = "}}";

/**
 * Escapes and variables together, escapes first.
 *
 * They cannot be two passes: `{{{{name}}}}` contains `{{name}}` starting at
 * its third brace, so a substitution pass run on its own would fill the very
 * text the escape exists to protect. Reading both in one sweep is what keeps
 * the extractor and the renderer agreeing on what counts as a variable.
 *
 * A fresh instance each call, because a global regular expression carries its
 * own `lastIndex` and a shared one silently skips matches on a second pass.
 */
export const tokenMatcher = () =>
  new RegExp(String.raw`(\{\{\{\{)|(\}\}\}\})|${VARIABLE_PATTERN}`, "g");

/** Anchored, for a tokeniser reading from the head of a source string. */
export const variableAtStart = () => new RegExp(`^${VARIABLE_PATTERN}`);
