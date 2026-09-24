export const PAGE_FRAME = "flex min-h-0 flex-1 flex-col overflow-y-auto";

export const PAGE_WIDTHS = {
  prose: "mx-auto w-full max-w-3xl px-5 xl:px-6",
  wide: "mx-auto w-full max-w-7xl px-5 xl:px-6",
} as const;

export type PageWidth = keyof typeof PAGE_WIDTHS;
