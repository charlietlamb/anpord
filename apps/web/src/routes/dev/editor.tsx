import type {
  ChannelPlacement,
  ResolvedPrompt,
} from "@anpord/schema/domain/prompts";
import { extractVariables } from "@anpord/ui/lib/prompt-variables";
import { ArrowUpIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PromptComposer } from "@/components/prompts/prompt-composer";
import { PromptEditorHeader } from "@/components/prompts/prompt-editor-header";
import { PromptRail } from "@/components/prompts/prompt-rail";
import { useDialog } from "@/lib/dialog/dialogs";

export const Route = createFileRoute("/dev/editor")({
  component: EditorPreview,
});

const BODY = Array.from(
  { length: 40 },
  (_, line) => `Line ${line + 1} of a prompt about {{topic}} for {{audience}}.`
).join("\n\n");

/** Fixed so the server and the client render the same timestamps. */
const EPOCH = Date.parse("2026-08-16T09:00:00.000Z");

const version = (number: number): ResolvedPrompt =>
  ({
    author: { image: null, name: "Charlie Lamb" },
    channel: number === 3 ? "production" : null,
    commitMessage: `Change number ${number}`,
    config: {},
    content: BODY,
    createdAt: new Date(EPOCH - number * 3_600_000),
    id: "support-triage",
    name: "Support triage",
    version: number,
    versionId: `v-${number}`,
  }) as unknown as ResolvedPrompt;

const VERSIONS = [8, 7, 6, 5, 4, 3, 2, 1].map(version);
const CHANNELS = [
  { channel: "production", version: 3 },
] as unknown as ChannelPlacement[];

function EditorPreview() {
  const [content, setContent] = useState(BODY);
  const [editing, setEditing] = useState(false);
  const { open: openDialog } = useDialog();

  return (
    <DashboardShell sidebarOpen>
      <div className="flex min-h-0 flex-1 flex-col pt-6 lg:absolute lg:inset-0 lg:top-14">
        <div className="px-6 lg:pr-[2.125rem] xl:px-8 xl:pr-[2.625rem]">
          <PromptEditorHeader
            correctingVersion={null}
            dirty={content !== BODY}
            name="Support triage"
            onCancelCorrection={() => undefined}
            onEditDetails={() => undefined}
            onSave={() => undefined}
            promptId="support-triage"
            saving={false}
            viewingVersion={null}
          />
        </div>

        <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-6 overflow-y-auto px-6 py-6 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem] lg:overflow-hidden lg:pr-0 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8 xl:px-8 xl:pr-0">
          <main className="flex min-h-0 min-w-0 flex-col">
            <PromptComposer
              content={content}
              fill
              onContentChange={setContent}
              onEditRequest={() =>
                openDialog("confirm", {
                  confirmLabel: "Edit from v8",
                  description:
                    "Saving adds a new version with these changes. v8 stays as it is.",
                  onConfirm: () => setEditing(true),
                  title: "Edit from v8?",
                })
              }
              onSubmit={() => undefined}
              readOnly={!editing}
              saving={false}
              submitIcon={ArrowUpIcon}
              submitLabel="Save version"
            />
          </main>

          <PromptRail
            channels={CHANNELS}
            channelsPending={false}
            editing={editing}
            onAddChannel={() => undefined}
            onEditFrom={() => undefined}
            onPoint={() => undefined}
            onPromote={() => undefined}
            onSelect={() => undefined}
            pointing={false}
            variables={extractVariables(content)}
            versions={VERSIONS}
            viewed={VERSIONS[0] as ResolvedPrompt}
          />
        </div>
      </div>
    </DashboardShell>
  );
}
