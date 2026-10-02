import type { HarnessEvent } from "@sphynx/schema/domain/harness-event";
import { Option, Schema } from "effect";

export const COMMAND_RECORDER = `sphynx_escape() {
  local s=$1
  s=\${s//\\\\/\\\\\\\\}
  s=\${s//\\"/\\\\\\"}
  s=\${s//$'\\t'/\\\\t}
  s=\${s//$'\\n'/\\\\n}
  s=\${s//$'\\r'/\\\\r}
  printf '%s' "$s"
}

sphynx_trace() {
  [ -n "$SPHYNX_TRACING" ] && return
  case "$BASH_COMMAND" in
    sphynx_trace* | sphynx_escape*) return ;;
  esac
  SPHYNX_TRACING=1
  printf '{"at":"%s","cwd":"%s","argv":"%s","source":"trap"}\\n' \\
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \\
    "$(sphynx_escape "$PWD")" \\
    "$(sphynx_escape "$BASH_COMMAND")" \\
    >> "$SPHYNX_TRACE_LOG" 2>/dev/null
  SPHYNX_TRACING=
}

if [ -n "$SPHYNX_TRACE_LOG" ]; then
  if [ -n "$ZSH_VERSION" ]; then
    mkdir -p "$(dirname "$SPHYNX_TRACE_LOG")" 2>/dev/null
    sphynx_zsh_trace() {
      BASH_COMMAND=$ZSH_DEBUG_CMD sphynx_trace
    }
    trap sphynx_zsh_trace DEBUG
  elif [ -n "$BASH_VERSION" ]; then
    mkdir -p "$(dirname "$SPHYNX_TRACE_LOG")" 2>/dev/null
    trap sphynx_trace DEBUG
  fi
fi
`;

const TraceLine = Schema.Struct({
  argv: Schema.String,
  at: Schema.String,
});

const decodeTraceLine = Schema.decodeUnknownOption(Schema.parseJson(TraceLine));

type CommandEvent = Extract<HarnessEvent, { _tag: "Command" }>;

const commandOf = (line: string): Option.Option<CommandEvent> =>
  decodeTraceLine(line).pipe(
    Option.flatMap((trace) => {
      const at = Date.parse(trace.at);

      return Number.isNaN(at)
        ? Option.none()
        : Option.some({
            _tag: "Command" as const,
            at,
            command: trace.argv,
            exitCode: null,
            output: "",
          });
    })
  );

export const traceToEvents = (text: string): CommandEvent[] =>
  text.split("\n").flatMap((line) =>
    Option.match(commandOf(line), {
      onNone: () => [],
      onSome: (command) => [command],
    })
  );

export const withoutReported = (
  trace: readonly CommandEvent[],
  reported: readonly HarnessEvent[]
): CommandEvent[] => {
  const seen = new Set(
    reported.flatMap((event) =>
      event._tag === "Command" ? [event.command] : []
    )
  );

  return trace.filter((command) => !seen.has(command.command));
};
