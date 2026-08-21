/** The scroll container a page sits in.
 *
 * `min-h-0` is what lets it shrink inside the flex column the shell builds;
 * without it the pane grows to its content and the app scrolls instead, which
 * puts the scrollbar in the middle of the screen rather than at its edge. */
export const PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto";

/** How wide the content inside that frame runs.
 *
 * A list is read down its left edge and does not need the room a prompt does,
 * but both are the same page to someone moving between them, so the wider of
 * the two is the default and `prose` is the exception a form asks for. */
export const PAGE_WIDTHS = {
  prose: "mx-auto w-full max-w-3xl px-5 xl:px-6",
  wide: "mx-auto w-full max-w-5xl px-5 xl:px-6",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;
