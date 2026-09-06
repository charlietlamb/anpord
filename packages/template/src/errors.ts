/** Plain `Error`: crosses the published SDK boundary, where callers use
 * `instanceof`. */
export class MissingVariables extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    const names = missing.map((name) => `{{${name}}}`).join(", ");
    super(
      `No value for ${names}. Pass them, or set onMissing to "keep" or "empty".`
    );
    this.name = "MissingVariables";
    this.missing = missing;
  }
}
