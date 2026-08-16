import { copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const docs = dirname(dirname(fileURLToPath(import.meta.url)));
const repository = dirname(dirname(docs));

await copyFile(join(repository, "openapi.json"), join(docs, "openapi.json"));
