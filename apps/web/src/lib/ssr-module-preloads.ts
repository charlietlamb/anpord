import preloads from "virtual:ssr-module-preloads";

export const ssrModulePreloads = (source: string) =>
  (preloads[source] ?? []).map((href) => ({ href, rel: "modulepreload" }));
