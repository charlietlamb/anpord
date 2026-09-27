import type { Context, Exit, Option, Tracer as TracerModule } from "effect";

export interface RecordedSpan {
  readonly durationMs: number;
  readonly failed: boolean;
  readonly name: string;
}

type Tracer = TracerModule.Tracer;
type Span = TracerModule.Span;
type AnySpan = TracerModule.AnySpan;
type SpanLink = TracerModule.SpanLink;

let counter = 0;
const nextId = () => {
  counter += 1;
  return counter.toString(16).padStart(16, "0");
};

export const spanRecorder = (make: typeof TracerModule.make) => {
  const recorded: RecordedSpan[] = [];

  const tracer: Tracer = make({
    context: (run) => run(),
    span: (name, parent, context, links, startTime, kind) => {
      const attributes = new Map<string, unknown>();
      const heldLinks: SpanLink[] = [...links];
      const span: Span & { status: Span["status"] } = {
        _tag: "Span",
        addLinks: (more) => {
          heldLinks.push(...more);
        },
        attribute: (key, value) => {
          attributes.set(key, value);
        },
        attributes,
        context: context as Context.Context<never>,
        end: (endTime: bigint, exit: Exit.Exit<unknown, unknown>) => {
          span.status = { _tag: "Ended", endTime, exit, startTime };
          recorded.push({
            durationMs: Number((endTime - startTime) / 1000n) / 1000,
            failed: exit._tag === "Failure",
            name,
          });
        },
        event: () => undefined,
        kind,
        links: heldLinks,
        name,
        parent: parent as Option.Option<AnySpan>,
        sampled: true,
        spanId: nextId(),
        status: { _tag: "Started", startTime },
        traceId: "perf",
      };
      return span;
    },
  });

  return {
    drain: () => recorded.splice(0, recorded.length),
    tracer,
  };
};
