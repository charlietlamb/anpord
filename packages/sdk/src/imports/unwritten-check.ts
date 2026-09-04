import { commentSafe, quoted } from "./typescript-literal";

const PLACEHOLDER = "unwritten";

/** The author's own words, kept whole, because they are the specification for
 * the check that replaces the line beneath them. */
export const proseLine = (text: string) =>
  [
    "          /* Write this check, then delete the line under it: */",
    `          /* ${commentSafe(text)} */`,
    `          ${PLACEHOLDER}(${quoted(text)}),`,
  ].join("\n");

/** Local rather than imported, so the generated file carries its own proof
 * that an unconverted assertion fails. Deleting the last call deletes it. */
export const placeholderBlock = [
  "/* A check nobody has written yet. It is false, so the case stays red until",
  "   the sentence above it becomes a real check. The argument is that",
  "   sentence, kept so the file says what is owed. */",
  `const ${PLACEHOLDER} = (_specification: string) => false;`,
].join("\n");
