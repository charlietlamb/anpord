import { useQuery } from "@tanstack/react-query";
import { codebaseQueries } from "@/lib/codebase-queries";
import { credentialQueries } from "@/lib/credential-queries";
import { evalQueries } from "@/lib/evals/eval-queries";
import { apiKeyQueries } from "@/lib/query/api-key-queries";
import { useOrganizations } from "@/lib/use-organizations";

interface SetupStep {
  readonly done: boolean;
  readonly label: string;
  readonly required: boolean;
  readonly to:
    | "/settings/harnesses"
    | "/settings/keys"
    | "/settings/codebase"
    | "/evals/new";
}

export interface SetupProgress {
  /* False while answers are still arriving, so the card cannot appear and then withdraw. */
  readonly known: boolean;
  readonly steps: readonly SetupStep[];
}

export function useSetupProgress(): SetupProgress {
  const connections = useQuery(credentialQueries.connections());
  const integrations = useQuery(credentialQueries.integrations());
  const account = useQuery(codebaseQueries.account());
  const evals = useQuery(evalQueries.list(null));
  const { activeOrganization } = useOrganizations();
  const keys = useQuery(apiKeyQueries.list(activeOrganization?.id ?? ""));

  const harnesses = new Set(
    (integrations.data ?? [])
      .filter((integration) => integration.category === "harness")
      .map((integration) => integration.id)
  );

  return {
    known:
      !(
        connections.isPending ||
        integrations.isPending ||
        account.isPending ||
        evals.isPending ||
        keys.isPending
      ) &&
      connections.error === null &&
      integrations.error === null,
    steps: [
      {
        done: (connections.data ?? []).some((connection) =>
          harnesses.has(connection.integrationId)
        ),
        label: "Connect a harness",
        required: true,
        to: "/settings/harnesses",
      },
      {
        done: (keys.data ?? []).length > 0,
        label: "Create an API key",
        required: true,
        to: "/settings/keys",
      },
      {
        done: account.data != null,
        label: "Connect GitHub",
        required: false,
        to: "/settings/codebase",
      },
      {
        done: (evals.data?.total ?? 0) > 0,
        label: "Write your first eval",
        required: true,
        to: "/evals/new",
      },
    ],
  };
}
