import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      /* Shiki's core re-exports a wasm loader for the Oniguruma engine, which
         Vite cannot bundle without a plugin. The JavaScript engine is the one
         in use and never reaches it, so the module is stubbed rather than the
         app carrying a wasm pipeline for a path nothing takes. */
      "shiki/wasm": fileURLToPath(
        new URL("./src/lib/shiki-wasm-stub.ts", import.meta.url)
      ),
    },
  },
  server: { port: 3005 },
  ssr: { noExternal: [/^@anpord\//] },
  optimizeDeps: { exclude: ["@tanstack/start-server-core"] },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
});
