/**
 * A template asked for something the caller did not supply.
 *
 * A plain `Error` rather than a tagged one: this package has no dependencies,
 * and it is thrown across the published SDK boundary where callers reach for
 * `instanceof`.
 */
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
