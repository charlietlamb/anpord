/** The scroll container a page sits in.
 *
 * `min-h-0` is what lets it shrink inside the flex column the shell builds;
 * without it the pane grows to its content and the app scrolls instead, which
 * puts the scrollbar in the middle of the screen rather than at its edge. */
export const PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto";

/** How wide the content inside that frame runs.
 *
 * Measured rather than full: a row stretched across a wide display puts its
 * name at one edge and its meta at the other, with a stretch of nothing
 * between them that the eye has to cross to connect the two. Holding the
 * column keeps both ends of a row in one glance, which is why a list takes
 * `prose`. `wide` is for a page carrying two columns of its own, where the
 * same measure would leave neither of them room. */
export const PAGE_WIDTHS = {
  prose: "mx-auto w-full max-w-3xl px-5 xl:px-6",
  wide: "mx-auto w-full max-w-5xl px-5 xl:px-6",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;
