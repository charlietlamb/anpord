/** Separators for a stacked list of rows.
 *
 * Tailwind's `divide-y` is the usual tool, but it only sets a border *width* on
 * `:not(:first-child)`. Rows built from `Button` carry a transparent border of
 * their own to keep their size stable on focus, and that colour wins on the
 * shared shorthand — the dividers stay invisible while the first row draws a
 * stray line under the card header. Setting width and colour on the same
 * scoped selector avoids both.
 *
 * The weight is the faintest of the three edges: rows of one list are already
 * grouped by their column, so the rule only has to keep them from touching. */
export const ROW_DIVIDERS =
  "[&>*:not(:first-child)]:border-t [&>*:not(:first-child)]:border-t-border-faint";
