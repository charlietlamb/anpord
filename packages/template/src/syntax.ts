/* The editor's atom node, the extractor and the renderer must agree exactly,
   or a chip the renderer does not fill reaches the model as literal braces. */
export const VARIABLE_PATTERN = String.raw`\{\{\s*([\w.-]+)\s*\}\}`;

/** Doubling is the escape: backslashes would fight the markdown escaper and
 * JSON string literals. */
export const LITERAL_OPEN = "{{";
export const LITERAL_CLOSE = "}}";

/** One sweep, escapes first: `{{{{name}}}}` contains `{{name}}` from its third
 * brace, so a separate substitution pass would fill the escaped text. Fresh
 * instance each call because a global regex carries its own `lastIndex`. */
export const tokenMatcher = () =>
  new RegExp(String.raw`(\{\{\{\{)|(\}\}\}\})|${VARIABLE_PATTERN}`, "g");

/** Anchored, for a tokeniser reading from the head of a source string. */
export const variableAtStart = () => new RegExp(`^${VARIABLE_PATTERN}`);
