import { gzipSync } from "node:zlib";

const CHUNK_SIZE = 90_000;

export const packageProgram = (root: string, entry: string, source: string) => {
  const archive = gzipSync(source).toString("base64");
  const chunks = Array.from(
    { length: Math.ceil(archive.length / CHUNK_SIZE) },
    (_, index) => archive.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
  );
  const names = chunks.map((_, index) => `${index}.txt`);
  const loader = `#!/usr/bin/env node\nimport{readFile,writeFile}from"node:fs/promises";import{gunzipSync}from"node:zlib";const root=new URL("./",import.meta.url),names=${JSON.stringify(names)},data=(await Promise.all(names.map(name=>readFile(new URL(name,root),"utf8")))).join(""),runtime=new URL("runtime.mjs",root);await writeFile(runtime,gunzipSync(Buffer.from(data,"base64")));await import(runtime.href);`;

  return {
    entry: `${root}/${entry}`,
    files: Object.fromEntries([
      [`${root}/${entry}`, loader],
      ...names.map((name, index) => [`${root}/${name}`, chunks[index]]),
    ]),
  };
};
