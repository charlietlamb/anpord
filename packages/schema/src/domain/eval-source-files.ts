import { Schema } from "effect";

export const EvalSourceFile = Schema.Struct({
  path: Schema.String.pipe(
    Schema.maxLength(512),
    Schema.pattern(
      /^(?!\.{1,2}(?:\/|$))[^/\\:\0]+(?:\/(?!\.{1,2}(?:\/|$))[^/\\:\0]+)*$/
    )
  ),
  content: Schema.String.pipe(Schema.maxLength(1_000_000)),
});
export type EvalSourceFile = typeof EvalSourceFile.Type;

export const EvalSourceFiles = Schema.Array(EvalSourceFile).pipe(
  Schema.maxItems(100),
  Schema.filter(
    (files) => new Set(files.map(({ path }) => path)).size === files.length
  ),
  Schema.filter(
    (files) =>
      files.reduce((size, file) => size + file.content.length, 0) <= 1_000_000
  )
);
