const ESCAPED_IN_DOUBLE = new Set(["$", "`", '"', "\\", "\n"]);
const SPACE = /\s/;

interface Read {
  readonly next: number;
  readonly text: string;
}

const readSingle = (source: string, start: number): Read | null => {
  const end = source.indexOf("'", start + 1);

  return end === -1
    ? null
    : { next: end + 1, text: source.slice(start + 1, end) };
};

const readDouble = (source: string, start: number): Read | null => {
  let text = "";
  let index = start + 1;

  while (index < source.length && source[index] !== '"') {
    const following = source[index + 1] ?? "";

    if (source[index] === "\\" && ESCAPED_IN_DOUBLE.has(following)) {
      text += following;
      index += 2;
    } else {
      text += source[index];
      index += 1;
    }
  }

  return index < source.length ? { next: index + 1, text } : null;
};

const readBare = (source: string, start: number): Read | null => {
  const char = source[start] ?? "";

  if (char === "\\") {
    return { next: start + 2, text: source[start + 1] ?? "" };
  }

  return SPACE.test(char) ? null : { next: start + 1, text: char };
};

const readerFor = (char: string) => {
  if (char === "'") {
    return readSingle;
  }

  return char === '"' ? readDouble : readBare;
};

export const shellWordOf = (source: string): string | null => {
  let word = "";
  let index = 0;

  while (index < source.length) {
    const read = readerFor(source[index] ?? "")(source, index);

    if (read === null) {
      return null;
    }

    word += read.text;
    index = read.next;
  }

  return word;
};
