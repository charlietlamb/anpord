/** The scroll container a page sits in.
 *
 * `min-h-0` is what lets it shrink inside the flex column the shell builds;
 * without it the pane grows to its content and the app scrolls instead, which
 * puts the scrollbar in the middle of the screen rather than at its edge. */
export const PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto";

/** How wide the content inside that frame runs.
 *
 * A list runs the full pane: its rows are scanned down one edge and read across
 * to the other, and centring them in a column would strand the two ends of each
 * row on opposite sides of a gap. Prose is measured instead, because a
 * paragraph read at the width of a screen is a paragraph nobody finishes. */
export const PAGE_WIDTHS = {
  full: "w-full px-4 xl:px-5",
  prose: "mx-auto w-full max-w-3xl px-5 xl:px-6",
  wide: "mx-auto w-full max-w-5xl px-5 xl:px-6",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;
