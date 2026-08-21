/** A row whose hover reaches past the text it contains.
 *
 * With the panels gone, a row has no card edge to fill to. Left flush with the
 * text, its hover reads as a bar drawn around the words; pulled out to either
 * side, it reads as the row being pointed at. */
export const BLEED_ROW = "-mx-2 px-2";

/** The same, for a row that is the only thing on its line.
 *
 * The width compensates for the negative margin so the row still measures its
 * container. A row sharing the line with a control takes `flex-1` instead —
 * a fixed width there would push that control off the end. */
export const BLEED_ROW_FULL = "-mx-2 w-[calc(100%+1rem)] px-2";
