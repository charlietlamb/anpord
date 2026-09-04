import { Option, Schema } from "effect";
import type { HarnessEvent } from "../../domain/harness-event";

/**
 * Sourced by every non-interactive bash through BASH_ENV. Only bash and zsh
 * have a DEBUG trap, so `sh -c`, dash, and the shells Node or Python spawn
 * leave no line here; a customer who wants those prints `Command` itself.
 */
export const COMMAND_RECORDER = `# Sourced by every non-interactive bash through BASH_ENV.
#
# The DEBUG trap is the one shell hook that fires without a prompt, so it is
# what catches a command the agent nested inside another. It runs before the
# command, which is why these lines carry no exit code: a reader has to treat
# them as evidence that something ran, not as evidence that it worked.

# Escaped in the shell rather than by piping to a JSON encoder. The trap runs
# before every command, so a subprocess per line would cost more than the work
# being traced.
anpord_escape() {
  local s=$1
  s=\${s//\\\\/\\\\\\\\}
  s=\${s//\\"/\\\\\\"}
  s=\${s//$'\\t'/\\\\t}
  s=\${s//$'\\n'/\\\\n}
  s=\${s//$'\\r'/\\\\r}
  printf '%s' "$s"
}

# The command substitutions inside the trap run the trap's own functions, and
# a subshell inherits the trap; the flag stops those from tracing themselves.
anpord_trace() {
  [ -n "$ANPORD_TRACING" ] && return
  case "$BASH_COMMAND" in
    anpord_trace* | anpord_escape*) return ;;
  esac
  ANPORD_TRACING=1
  printf '{"at":"%s","cwd":"%s","argv":"%s","source":"trap"}\\n' \\
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \\
    "$(anpord_escape "$PWD")" \\
    "$(anpord_escape "$BASH_COMMAND")" \\
    >> "$ANPORD_TRACE_LOG" 2>/dev/null
  ANPORD_TRACING=
}

# zsh has a DEBUG trap too, but it reports the command in $ZSH_DEBUG_CMD rather
# than $BASH_COMMAND, and it fires after rather than before. Some sandboxes
# default to zsh, so guarding on BASH_VERSION alone collected nothing there.
if [ -n "$ANPORD_TRACE_LOG" ]; then
  if [ -n "$ZSH_VERSION" ]; then
    mkdir -p "$(dirname "$ANPORD_TRACE_LOG")" 2>/dev/null
    anpord_zsh_trace() {
      BASH_COMMAND=$ZSH_DEBUG_CMD anpord_trace
    }
    trap anpord_zsh_trace DEBUG
  elif [ -n "$BASH_VERSION" ]; then
    mkdir -p "$(dirname "$ANPORD_TRACE_LOG")" 2>/dev/null
    trap anpord_trace DEBUG
  fi
fi
`;

const TraceLine = Schema.Struct({
  argv: Schema.String,
  at: Schema.String,
});

const decodeTraceLine = Schema.decodeUnknownOption(TraceLine);

const parseJson = Option.liftThrowable((line: string): unknown =>
  JSON.parse(line)
);

export type CommandEvent = Extract<HarnessEvent, { _tag: "Command" }>;

const commandOf = (line: string): Option.Option<CommandEvent> =>
  parseJson(line).pipe(
    Option.flatMap(decodeTraceLine),
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

/** The recorder's log as commands. A line it cannot read is skipped. */
export const traceToEvents = (text: string): CommandEvent[] =>
  text.split("\n").flatMap((line) =>
    Option.match(commandOf(line), {
      onNone: () => [],
      onSome: (command) => [command],
    })
  );

/**
 * Trace commands the process already reported itself, dropped so a customer
 * who prints `Command` with an exit code is not shown the same line twice.
 */
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
