/** A row whose hover reaches past the text it contains.
 *
 * With the panels gone, a row has no card edge to fill to. Left flush with the
 * text, its hover reads as a bar drawn around the words; pulled out to either
 * side, it reads as the row being pointed at. The width compensates for the
 * negative margin so the row still measures its container. */
export const BLEED_ROW = "-mx-2 w-[calc(100%+1rem)] px-2";
