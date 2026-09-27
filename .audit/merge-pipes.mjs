import { readFileSync, writeFileSync } from "node:fs";

for (const file of process.argv.slice(2)) {
  let text = readFileSync(file, "utf8");
  const pattern = /\)\n\s*\.pipe\((Effect\.withSpan\("[^"]+"\))\)/;
  let match = pattern.exec(text);
  while (match !== null) {
    const closeAt = match.index;
    let depth = 0;
    let openAt = -1;
    for (let i = closeAt; i >= 0; i -= 1) {
      if (text[i] === ")") {
        depth += 1;
      }
      if (text[i] === "(") {
        depth -= 1;
      }
      if (depth === 0) {
        openAt = i;
        break;
      }
    }
    if (text.slice(openAt - 5, openAt) !== ".pipe") {
      throw new Error(`${file}: span not after a pipe at ${closeAt}`);
    }
    text = `${text.slice(0, closeAt)}, ${match[1]})${text.slice(match.index + match[0].length)}`;
    match = pattern.exec(text);
  }
  writeFileSync(file, text);
}
