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
  /* Dozens of sub-kilobyte chunks -- one per icon, one per small hook -- each
     cost a request and a module evaluation on first paint. Grouped so the
     shell arrives in a few files rather than eighty. */
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("@phosphor-icons")) {
            return "icons";
          }
          if (id.includes("@base-ui") || id.includes("@floating-ui")) {
            return "ui-primitives";
          }
          if (id.includes("node_modules/react") || id.includes("react-dom")) {
            return "react";
          }
          return;
        },
      },
    },
  },
  server: { port: 3005 },
  ssr: { noExternal: [/^@anpord\//] },
  optimizeDeps: { exclude: ["@tanstack/start-server-core"] },
  plugins: [tailwindcss(), tanstackStart(), nitro(), viteReact()],
});
