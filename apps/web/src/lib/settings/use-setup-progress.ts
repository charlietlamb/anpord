import { useQuery } from "@tanstack/react-query";
import { codebaseQueries } from "@/lib/codebase-queries";
import { credentialQueries } from "@/lib/credential-queries";

interface SetupStep {
  readonly done: boolean;
  readonly label: string;
  /** Optional steps are shown but never hold the card open. */
  readonly required: boolean;
  readonly to: "/settings/harnesses" | "/settings/codebase";
}

export interface SetupProgress {
  /** False while the answers are still arriving, so the card cannot appear
   * and then withdraw once a connection turns out to exist. */
  readonly known: boolean;
  readonly steps: readonly SetupStep[];
}

/**
 * What is still missing before an eval can run.
 *
 * A harness is the only hard requirement: sandboxes fall back to Anpord's
 * account, and GitHub is what turns a URL box into a repository list. The
 * card that reads this is dismissible, so an organization that means to type
 * its repository URLs is not nagged about a step it does not want.
 */
export function useSetupProgress(): SetupProgress {
  const connections = useQuery(credentialQueries.connections());
  const integrations = useQuery(credentialQueries.integrations());
  const account = useQuery(codebaseQueries.account());

  const harnesses = new Set(
    (integrations.data ?? [])
      .filter((integration) => integration.category === "harness")
      .map((integration) => integration.id)
  );

  return {
    known:
      !(connections.isPending || integrations.isPending || account.isPending) &&
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
        done: account.data != null,
        label: "Connect GitHub",
        required: false,
        to: "/settings/codebase",
      },
    ],
  };
}
