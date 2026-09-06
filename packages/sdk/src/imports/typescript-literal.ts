/* Backslash first, so the escapes added after it are not themselves escaped. */
export const quoted = (value: string) =>
  `"${value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")}"`;

/* A backtick ends the literal and a substitution opens with two characters, so
   both are escaped; a lone dollar means nothing on its own. */
export const templated = (value: string) =>
  `\`${value
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("${", "\\${")}\``;

/* A comment cannot carry the sequence that closes it, and a newline would let
   the rest of the text run as code. */
export const commentSafe = (value: string) =>
  value.replaceAll("*/", "*\\/").replaceAll(/\r?\n/g, " ");
