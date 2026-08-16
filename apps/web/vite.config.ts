import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 3005 },
  ssr: { noExternal: [/^@anpord\//] },
  /** Start's entry points and route manifest are virtual modules the plugin
   * supplies during the build. Pre-bundling resolves imports ahead of that, so
   * esbuild would fail on specifiers that do not exist on disk yet. */
  optimizeDeps: { exclude: ["@tanstack/start-server-core"] },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
});
