import { relative } from "node:path";
import type { Plugin } from "vite";

const ID = "virtual:ssr-module-preloads";
let preloads: Record<string, string[]> = {};

export const dynamicChunkPreloads = (root: string): Plugin => ({
  name: "sphynx:ssr-module-preloads",
  sharedDuringBuild: true,
  resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
  load: (id) =>
    id === `\0${ID}`
      ? `export default ${JSON.stringify(preloads)};`
      : undefined,
  generateBundle(_, bundle) {
    if (this.environment.name !== "client") {
      return;
    }
    const chunks = new Map(
      Object.values(bundle).flatMap((output) =>
        output.type === "chunk" ? [[output.fileName, output] as const] : []
      )
    );
    const reach = (fileName: string, seen: Set<string>) => {
      if (!seen.has(fileName)) {
        seen.add(fileName);
        for (const imported of chunks.get(fileName)?.imports ?? []) {
          reach(imported, seen);
        }
      }
    };
    const reachable = new Map<string, Set<string>>();
    for (const chunk of chunks.values()) {
      if (chunk.isDynamicEntry && chunk.facadeModuleId) {
        const source = relative(root, chunk.facadeModuleId.split("?")[0]);
        const seen = reachable.get(source) ?? new Set();
        reach(chunk.fileName, seen);
        reachable.set(source, seen);
      }
    }
    preloads = Object.fromEntries(
      [...reachable].map(([source, files]) => [
        source,
        [...files].map((file) => `/${file}`),
      ])
    );
  },
});
