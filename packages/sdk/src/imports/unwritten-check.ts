import { commentSafe, quoted } from "./typescript-literal";

const PLACEHOLDER = "unwritten";

/* The author's words are kept whole: they specify the check that replaces the
   placeholder beneath them. */
export const proseLine = (text: string) =>
  [
    "          /* Write this check, then delete the line under it: */",
    `          /* ${commentSafe(text)} */`,
    `          ${PLACEHOLDER}(${quoted(text)}),`,
  ].join("\n");

/* Local rather than imported, so deleting the last call deletes it too. */
export const placeholderBlock = [
  "/* A check nobody has written yet. It is false, so the case stays red until",
  "   the sentence above it becomes a real check. The argument is that",
  "   sentence, kept so the file says what is owed. */",
  `const ${PLACEHOLDER} = (_specification: string) => false;`,
].join("\n");
