declare module "virtual:ssr-module-preloads" {
  const preloads: Readonly<Record<string, readonly string[]>>;
  export default preloads;
}
