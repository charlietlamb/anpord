import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { PromptEditorSkeleton } from "@/components/prompts/prompt-editor-skeleton";
import { PromptUnavailable } from "@/components/prompts/prompt-unavailable";
import { activityQueries } from "@/lib/query/activity-queries";
import { channelQueries } from "@/lib/query/channel-queries";
import { promptQueries } from "@/lib/query/prompt-queries";

export const Route = createFileRoute("/_authed/prompts/$id")({
  ssr: false,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.prefetchQuery(promptQueries.versions(params.id)),
      context.queryClient.prefetchQuery(promptQueries.channels(params.id)),
      context.queryClient.prefetchQuery(channelQueries.list()),
      context.queryClient.ensureInfiniteQueryData(
        activityQueries.forPrompt(params.id)
      ),
    ]),
  component: PromptDetailPage,
  staticData: { crumb: (params) => params.id },
});

function PromptDetailPage() {
  const { id } = Route.useParams();
  const versions = useQuery(promptQueries.versions(id));
  const rows = versions.data;
  const latest = rows?.at(0) ?? null;

  if (versions.isPending) {
    return <PromptEditorSkeleton promptId={id} />;
  }
  if (!(rows && latest)) {
    return <PromptUnavailable failed={versions.error !== null} />;
  }

  return <PromptEditor id={id} latest={latest} versions={rows} />;
}
