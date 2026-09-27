import { readFileSync, writeFileSync } from "node:fs";

const [file, service, indent = "6"] = process.argv.slice(2);
const pad = " ".repeat(Number(indent));
const text = readFileSync(file, "utf8");
const open = text.indexOf(`${" ".repeat(Number(indent) - 2)}return {\n`);
if (open < 0) {
  throw new Error(`no return object in ${file}`);
}
const close = text.indexOf(`\n${" ".repeat(Number(indent) - 2)}}`, open);
const head = text.slice(0, open);
const tail = text.slice(close);
const lines = text.slice(open, close).split("\n");
const out = [];
let name = null;
let buffer = [];
const skipped = [];
const flush = () => {
  if (name === null) {
    out.push(...buffer);
  } else {
    let block = buffer.join("\n").replace(/\n+$/, "");
    const trailing = buffer.join("\n").slice(block.length);
    if (
      block.includes("withSpan(") ||
      /=>\s*\{\s*$/m.test(block.split("\n")[0])
    ) {
      skipped.push(name);
      out.push(...buffer);
    } else {
      block = block.replace(/,$/, "");
      out.push(
        `${block}.pipe(Effect.withSpan("${service}.${name}")),${trailing}`
      );
    }
  }
  buffer = [];
  name = null;
};
const method = new RegExp(`^${pad}(\\w+): `);
for (const line of lines) {
  const m = line.match(method);
  if (m) {
    flush();
    name = m[1];
  }
  buffer.push(line);
}
flush();
writeFileSync(file, head + out.join("\n") + tail);
console.log(`${file}: skipped ${skipped.join(", ") || "none"}`);
