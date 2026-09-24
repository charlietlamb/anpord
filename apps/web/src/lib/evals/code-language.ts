import type { CodeLanguage } from "@anpord/ui/lib/highlight";

const TYPESCRIPT = /\.[cm]?[jt]sx?$/;
const MARKDOWN = /\.mdx?$/;
export const codeLanguage = (path: string): CodeLanguage => {
  if (TYPESCRIPT.test(path)) {
    return "typescript";
  }
  if (path.endsWith(".json")) {
    return "json";
  }
  if (MARKDOWN.test(path)) {
    return "markdown";
  }
  if (path.endsWith(".sh")) {
    return "bash";
  }
  return "text";
};
