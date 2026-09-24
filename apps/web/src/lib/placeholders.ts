const WORDS = [
  "billing",
  "asks before it pushes",
  "fixes the proration test",
  "keeps main untouched",
  "reads the schema first",
  "adds a changelog entry",
];

export const placeholderText = (index: number) =>
  WORDS[index % WORDS.length] ?? "placeholder";

export const placeholders = <A>(count: number, make: (index: number) => A) =>
  Array.from({ length: count }, (_, index) => make(index));
