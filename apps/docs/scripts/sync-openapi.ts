import { copyFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const docs = dirname(dirname(fileURLToPath(import.meta.url)));
const repository = dirname(dirname(docs));
const spec = join(docs, "openapi.json");

await copyFile(join(repository, "openapi.json"), spec);

interface Operation {
  readonly description?: string;
  readonly summary?: string;
}

interface Document {
  readonly paths: Record<string, Record<string, Operation>>;
}

const document: Document = await Bun.file(spec).json();

const slug = (path: string) => path.replace("/v1/", "").replace(".", "-");

await Promise.all(
  Object.entries(document.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) =>
      writeFile(
        join(docs, "api-reference", `${slug(path)}.mdx`),
        [
          "---",
          `title: "${operation.summary ?? path}"`,
          `description: "${operation.description ?? ""}"`,
          `openapi: "${method.toUpperCase()} ${path}"`,
          "---",
          "",
        ].join("\n")
      )
    )
  )
);
