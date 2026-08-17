import type { HttpApiEndpoint, HttpApiGroup } from "@effect/platform";

/** The endpoint names a group declares, so a permission map can be keyed by
 * them and checked for exhaustiveness at compile time. */
export type EndpointName<Group> =
  Group extends HttpApiGroup.HttpApiGroup<
    infer _Name,
    infer Endpoints,
    infer _Error,
    infer _R,
    infer _TopLevel
  >
    ? HttpApiEndpoint.HttpApiEndpoint.Name<Endpoints>
    : never;
