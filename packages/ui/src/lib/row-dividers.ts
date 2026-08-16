/** Separators for a stacked list of rows.
 *
 * Tailwind's `divide-y` is the usual tool, but it only sets a border *width* on
 * `:not(:first-child)`. Rows built from `Button` carry a transparent border of
 * their own to keep their size stable on focus, and that colour wins on the
 * shared shorthand — the dividers stay invisible while the first row draws a
 * stray line under the card header. Setting width and colour on the same
 * scoped selector avoids both. */
export const ROW_DIVIDERS =
  "[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-t-border-surface";
