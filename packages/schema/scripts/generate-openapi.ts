import { writeFileSync } from "node:fs";
import { OpenApi } from "@effect/platform";
import { PublicApi } from "../src/public/api";

const OUTPUT = new URL("../../../apps/docs/openapi.json", import.meta.url)
  .pathname;

writeFileSync(
  OUTPUT,
  `${JSON.stringify(OpenApi.fromApi(PublicApi), null, 2)}\n`
);

process.stdout.write(`wrote ${OUTPUT}\n`);
