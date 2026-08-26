import type {
  CredentialConnection,
  CredentialSelections,
} from "@anpord/schema/domain/credentials";
import type { EvalAgent, EvalProvider } from "@anpord/schema/domain/evals";

/** Everything a run can be pointed at a credential for. */
export const selectableCredentialIntegrations = (
  agents: readonly EvalAgent[],
  providers: readonly EvalProvider[]
) => [...new Set([...agents.map((agent) => agent.harness), ...providers])];

/**
 * The ones a run cannot start without.
 *
 * Only harnesses. Model usage is charged to the account behind the
 * credential, so there is nobody to bill without one and the server refuses
 * the run. A sandbox without a connection falls back to Anpord's own account
 * for that provider, so requiring one here disabled the button over something
 * that would have run.
 */
export const requiredCredentialIntegrations = (
  agents: readonly EvalAgent[]
) => [...new Set(agents.map((agent) => agent.harness))];

const optionsFor = (
  connections: readonly CredentialConnection[],
  integrationId: string
) =>
  connections.filter(
    (connection) =>
      connection.integrationId === integrationId &&
      connection.status === "active"
  );

export const normalizeCredentialSelections = (
  integrationIds: readonly string[],
  connections: readonly CredentialConnection[],
  selected: CredentialSelections
): CredentialSelections =>
  Object.fromEntries(
    integrationIds.flatMap((integrationId) => {
      const options = optionsFor(connections, integrationId);
      const connection =
        options.find((item) => item.id === selected[integrationId]) ??
        options.find((item) => item.isDefault && item.scope === "personal") ??
        options.find((item) => item.isDefault) ??
        options[0];
      return connection === undefined ? [] : [[integrationId, connection.id]];
    })
  );

export const missingCredentialIntegrations = (
  integrationIds: readonly string[],
  connections: readonly CredentialConnection[],
  selected: CredentialSelections
) =>
  integrationIds.filter(
    (integrationId) =>
      !optionsFor(connections, integrationId).some(
        (connection) => connection.id === selected[integrationId]
      )
  );
