/** Shared by the rail and its skeleton so the column's width cannot change
 * underneath a reader mid-load. Not a scroller of its own: a short column that
 * owns the wheel swallows it, so pointing at the rail stopped the page moving. */
export const RAIL_FRAME =
  "order-2 flex flex-col gap-5 lg:-mx-2 lg:sticky lg:top-0 lg:px-2 lg:pt-5 lg:pb-8";
