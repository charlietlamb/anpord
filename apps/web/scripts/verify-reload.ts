import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";
import type { Nitro } from "nitro/types";
import { createServer } from "vite";

let nitro: Nitro | undefined;
const server = await createServer({
  nitro: {
    modules: [
      (instance) => {
        nitro = instance;
      },
    ],
  },
  server: { port: 3006, strictPort: true },
});

try {
  await server.listen();
  const url = server.resolvedUrls?.local[0];
  assert.ok(url);
  await setTimeout(1500);

  for (let reload = 0; reload < 4; reload++) {
    if (reload > 0) {
      const ssr = server.environments.ssr;
      assert.ok(ssr);
      ssr.moduleGraph.invalidateAll();
      ssr.hot.send({ type: "full-reload" });
      await setTimeout(1500);
    }

    for (const accept of ["text/html", "application/json"]) {
      const response = await fetch(url, {
        headers: { accept },
      });
      await response.text();
      assert.equal(response.status, 200, `Reload ${reload}, accept ${accept}`);
    }
  }

  console.log("SSR passed before and after three reloads.");
} finally {
  await server.close();
  await nitro?.close();
}
