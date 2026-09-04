/** A backslash-escaped double-quoted literal. Backslash first, so the escapes
 * added after it are not themselves escaped. */
export const quoted = (value: string) =>
  `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")}"`;

/** A template literal, which keeps a multi-line prompt readable in the
 * generated file. A backtick ends the literal and `${` opens a substitution,
 * so both are escaped; a lone `$` is left alone because only the pair means
 * anything. A trailing backslash would escape the closing backtick. */
export const templated = (value: string) =>
  `\`${value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${")}\``;

/** A comment cannot carry the sequence that closes it, and a newline would end
 * a line comment and let the rest of the text run as code. */
export const commentSafe = (value: string) =>
  value.replaceAll("*/", "*\\/").replaceAll(/\r?\n/g, " ");
