/** `min-h-0` lets it shrink inside the shell's flex column; without it the pane
 * grows to its content and the app scrolls instead. */
export const PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto";

/** Lists take `prose`; `wide` is for a page carrying two columns of its own. */
export const PAGE_WIDTHS = {
  prose: "mx-auto w-full max-w-3xl px-5 xl:px-6",
  wide: "mx-auto w-full max-w-5xl px-5 xl:px-6",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;
