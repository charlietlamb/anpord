export const EVAL_FILE_PATTERN = "**/*.eval.ts";

export const EVAL_FILE_IGNORES = [
  "**/.git/**",
  "**/.next/**",
  "**/.output/**",
  "**/build/**",
  "**/coverage/**",
  "**/dist/**",
  "**/node_modules/**",
] as const;
