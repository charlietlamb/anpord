/** The rail's own geometry, shared by the rail and its skeleton so the two
 * cannot drift and swap the column's width underneath a reader mid-load.
 *
 * Held in view while the prompt scrolls past it, capped to the screen so a rail
 * longer than the viewport can still reach its end, and carrying the width its
 * rows bleed into so a label cannot lose its first character to the clip.
 *
 * The gap is the frame's to set. Three rails each overrode it with a different
 * value, which left a shared constant that no rail actually shared. */
export const RAIL_FRAME =
  "no-scrollbar order-2 flex flex-col gap-5 lg:-mx-2 lg:sticky lg:top-0 lg:h-svh lg:overflow-y-auto lg:overscroll-contain lg:px-2 lg:pt-5 lg:pb-8";
