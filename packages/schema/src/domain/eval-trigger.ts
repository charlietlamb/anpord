import { Schema } from "effect";

export const EvalTrigger = Schema.Struct({
  source: Schema.Literal("dashboard", "api", "cli", "ci", "mcp"),
  url: Schema.optional(
    Schema.String.pipe(
      Schema.maxLength(2048),
      Schema.filter(
        (value) => {
          if (!URL.canParse(value)) {
            return false;
          }
          const url = new URL(value);
          return (
            ["https:", "http:"].includes(url.protocol) &&
            !url.username &&
            !url.password
          );
        },
        { message: () => "Use an HTTP or HTTPS URL without credentials." }
      )
    )
  ),
}).annotations({
  identifier: "EvalTrigger",
  description:
    "What started this run. Client-reported context, not authorization.",
});
export type EvalTrigger = typeof EvalTrigger.Type;
