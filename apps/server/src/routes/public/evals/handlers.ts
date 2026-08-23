import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import {
  getCellHistory,
  getEvalModels,
  getEvalRun,
  listEvalRuns,
  rerunEvalCell,
  startEvalRun,
} from "../../evals/operations";

export const PublicEvalsHandlers = HttpApiBuilder.group(
  PublicApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Evals.Read }, ({ payload }) =>
        listEvalRuns({
          cursorId: payload.cursor?.id,
          cursorStartedAt: payload.cursor?.startedAtMillis,
          limit: payload.limit,
        })
      )
      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        startEvalRun(payload)
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ payload }) =>
        getEvalRun(payload.id)
      )
      .handle(
        "cellHistory",
        { permission: Permissions.Evals.Read },
        ({ payload }) => getCellHistory(payload.cellKey)
      )
      .handle(
        "rerunCell",
        { permission: Permissions.Evals.Write },
        ({ payload }) => rerunEvalCell(payload)
      )
      .handle("models", { permission: Permissions.Evals.Read }, ({ payload }) =>
        getEvalModels(payload.harness, payload.q)
      ).done
);
