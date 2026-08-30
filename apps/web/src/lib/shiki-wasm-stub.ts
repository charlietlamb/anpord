/**
 * Stands in for shiki's wasm loader.
 *
 * Only the Oniguruma engine loads it, and this app uses the JavaScript one.
 * Bundling the real module would mean adding a wasm plugin to Vite for a code
 * path that never runs.
 */
export default undefined;
