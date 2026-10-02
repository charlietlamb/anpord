import { HttpApiBuilder } from "@effect/platform";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { PublicApi } from "@sphynx/schema/public/api";
import { authorized } from "../../../http/authorization/authorized-group";
import { listModels } from "../../evals/catalog-reads";

export const ModelsHandlers = HttpApiBuilder.group(
  PublicApi,
  "models",
  (handlers) =>
    authorized(handlers).handle(
      "list",
      { permission: Permissions.Evals.Read },
      ({ payload }) => listModels(payload.harness, payload.q)
    ).done
);
