// biome-ignore-all lint/performance/noBarrelFile: Public package entry point.

/* The compiler also exports an Effect-returning variant for the CLI to build
   on. That is internal, and naming it here would make it a public promise. */
export { compileDefinition, compileEval } from "./compiler";
