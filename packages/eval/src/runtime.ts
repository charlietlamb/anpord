import { ClusterWorkflowEngine } from "@effect/cluster";
import { NodeClusterSocket } from "@effect/platform-node";
import { PgClient } from "@effect/sql-pg";
import { Config, Layer, Redacted } from "effect";
import { EvalSandboxLive } from "./layer";
import { TrialRunnerLive } from "./services/trial-runner";
import { TrialWorkflowLive } from "./workflow/trial";

const clusterDatabase = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL").pipe(
    Config.withDefault(
      Redacted.make("postgresql://anpord:anpord@localhost:55433/anpord")
    )
  ),
});

/**
 * The engine opens a real socket server rather than running purely in process,
 * so the port is configurable instead of inherited. Left on the default, two
 * local processes fight over one port and a container publishes the wrong one.
 *
 * The address itself stays as the engine's own default: it is an `Option` in
 * the sharding config, and passing `undefined` through this record makes the
 * layer read a property off nothing and die before anything starts.
 */
const clusterRunner = NodeClusterSocket.layer({ storage: "sql" });

/** The engine owns and migrates its own `cluster_*` tables, so this adds no
 * schema we maintain. It does share the database, which is why drizzle-kit is
 * told to leave those tables alone. */
export const WorkflowEngineLive = ClusterWorkflowEngine.layer.pipe(
  Layer.provideMerge(clusterRunner),
  Layer.provideMerge(clusterDatabase)
);

/** Everything a trial needs to execute durably: the workflow definition, the
 * runner it calls, and the engine that makes an activity survive a restart. */
export const EvalWorkflowLive = TrialWorkflowLive.pipe(
  Layer.provide(TrialRunnerLive),
  Layer.provide(EvalSandboxLive),
  Layer.provideMerge(WorkflowEngineLive)
);
