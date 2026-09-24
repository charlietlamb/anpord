import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import { listModels } from "../../evals/evals";

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
