import { commandText } from "@anpord/schema/domain/eval-journal";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  ToolSection,
  type ToolState,
} from "@anpord/ui/components/ai-elements/tool";
import { ShellText } from "@anpord/ui/components/ui/shell-text";
import { CallName } from "@/components/evals/call-name";
import { KindIcon } from "@/components/evals/kind-icon";
import { type Call, durationOf, stepFailed } from "@/lib/evals/conversation";
import { seconds } from "@/lib/evals/duration";

const stateOf = (call: Call): ToolState =>
  stepFailed(call) ? "error" : "completed";

const statusOf = (call: Call) => {
  if (!stepFailed(call)) {
    return;
  }

  return call._tag === "command"
    ? `Exit ${call.exitCode}`
    : (call.status ?? "Failed");
};

export function ConversationStep({
  call,
  defaultOpen = false,
}: {
  readonly call: Call;
  readonly defaultOpen?: boolean;
}) {
  const took = durationOf(call);

  if (call._tag === "command") {
    const command = commandText(call.command);

    return (
      <Tool defaultOpen={defaultOpen}>
        <ToolHeader
          icon={<KindIcon failed={stepFailed(call)} kind="command" />}
          meta={took === null ? undefined : seconds(took)}
          state={stateOf(call)}
          status={statusOf(call)}
          title={<span className="font-mono text-xs">{command}</span>}
        />
        <ToolContent>
          <ToolSection copy={command} label="Command">
            <ShellText command={command} />
          </ToolSection>
          <ToolOutput output={call.output} truncated={call.outputTruncated} />
        </ToolContent>
      </Tool>
    );
  }

  return (
    <Tool defaultOpen={defaultOpen}>
      <ToolHeader
        icon={<KindIcon failed={stepFailed(call)} kind="toolCall" />}
        meta={took === null ? undefined : seconds(took)}
        state={stateOf(call)}
        status={statusOf(call)}
        title={<CallName name={call.name} />}
      />
      <ToolContent>
        <ToolInput input={call.input} truncated={call.inputTruncated} />
        <ToolOutput
          errorText={call.error}
          output={call.output}
          truncated={call.outputTruncated}
        />
      </ToolContent>
    </Tool>
  );
}
