# Sourced by every non-interactive bash through BASH_ENV.
#
# The DEBUG trap is the one shell hook that fires without a prompt, so it is
# what catches a command the agent nested inside another. It runs before the
# command, which is why these lines carry no exit code: a reader has to treat
# them as evidence that something ran, not as evidence that it worked.

ANPORD_TRACE_LOG="${ANPORD_TRACE_LOG:-/var/log/anpord/trace.ndjson}"

# Escaped in the shell rather than by piping to a JSON encoder. The trap runs
# before every command, so a subprocess per line would cost more than the work
# being traced.
anpord_escape() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\t'/\\t}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  printf '%s' "$s"
}

anpord_trace() {
  case "$BASH_COMMAND" in
    anpord_trace* | anpord_escape*) return ;;
  esac

  printf '{"at":"%s","cwd":"%s","argv":"%s","source":"trap"}\n' \
    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    "$(anpord_escape "$PWD")" \
    "$(anpord_escape "$BASH_COMMAND")" \
    >> "$ANPORD_TRACE_LOG" 2>/dev/null
}

# zsh has a DEBUG trap too, but it reports the command in $ZSH_DEBUG_CMD rather
# than $BASH_COMMAND, and it fires after rather than before. Daytona's default
# shell is zsh, so guarding on BASH_VERSION alone collected nothing there.
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
