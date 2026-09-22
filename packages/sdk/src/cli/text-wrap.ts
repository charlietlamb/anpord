const NARROWEST = 20;
const LEADING_SPACE = /^\s*/;
const WORDS = /\s+/;
const TAB = /\t/g;
const CARRIAGE = /\r\n?/g;

const wrapLine = (line: string, width: number): readonly string[] => {
  if (line.length <= width) {
    return [line];
  }

  const indent = LEADING_SPACE.exec(line)?.[0] ?? "";
  const lines: string[] = [];
  let current = "";

  for (const word of line.trim().split(WORDS)) {
    const next = current === "" ? `${indent}${word}` : `${current} ${word}`;

    if (next.length > width && current !== "") {
      lines.push(current);
      current = `${indent}${word}`;
    } else {
      current = next;
    }
  }

  lines.push(current);

  return lines;
};

export const wrapText = (text: string, width: number): readonly string[] => {
  const kept: string[] = [];

  for (const line of text
    .replace(CARRIAGE, "\n")
    .replace(TAB, "  ")
    .split("\n")) {
    const trimmed = line.trimEnd();

    if (trimmed !== "" || (kept.length > 0 && kept.at(-1) !== "")) {
      kept.push(trimmed);
    }
  }

  while (kept.at(-1) === "") {
    kept.pop();
  }

  return kept.flatMap((line) =>
    line === "" ? [""] : wrapLine(line, Math.max(NARROWEST, width))
  );
};
