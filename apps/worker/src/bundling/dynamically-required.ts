import { builtinModules, createRequire } from "node:module";
import type { defineConfig } from "@trigger.dev/sdk";

/* Taken from the config it is passed to, so the extension shape follows the
   installed CLI rather than a second dependency on its internals. */
type BuildExtension = NonNullable<
  NonNullable<Parameters<typeof defineConfig>[0]["build"]>["extensions"]
>[number];

/* Modules a package loads through require() at runtime are invisible to the
   bundler, which ships a stub: every Daytona upload failed on one. A package
   marks them false in its browser field, so it names them itself. */
export const dynamicallyRequired = (
  packageName: string,
  from: string
): BuildExtension => ({
  externalsForTarget: () => stubbedForBrowsers(packageName, from),
  name: `dynamically-required:${packageName}`,
});

const stubbedForBrowsers = (packageName: string, from: string) => {
  const require = createRequire(from);
  const manifest = require(`${packageName}/package.json`) as {
    browser?: Record<string, string | false>;
  };

  return Object.entries(manifest.browser ?? {})
    .filter(([, replacement]) => replacement === false)
    .map(([module]) => module)
    .filter((module) => !isBuiltin(module));
};

const isBuiltin = (module: string) =>
  module.startsWith("node:") || builtinModules.includes(module);
