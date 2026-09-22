import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import { getEvalArtifact } from "../../evals/artifacts";
import { leaseCredentials } from "../../evals/credential-lease";
import {
  getCellHistory,
  getEvalModels,
  getEvalRun,
  getRunSubscription,
  listEvalCases,
  listEvalRuns,
  readRunTail,
  rerunEvalCell,
  startEvalRun,
} from "../../evals/operations";
import { finishReportedRun, reportTrial } from "../../evals/reported-trials";

export const PublicEvalsHandlers = HttpApiBuilder.group(
  PublicApi,
  "evals",
  (handlers) =>
    authorized(handlers)
      .handle(
        "artifact",
        { permission: Permissions.Evals.Read },
        ({ payload }) => getEvalArtifact(payload)
      )
      .handle("list", { permission: Permissions.Evals.Read }, ({ payload }) =>
        listEvalRuns({
          cursorId: payload.cursor?.id,
          cursorStartedAt: payload.cursor?.startedAtMillis,
          limit: payload.limit,
        })
      )
      .handle("cases", { permission: Permissions.Evals.Read }, ({ payload }) =>
        listEvalCases(payload)
      )
      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        startEvalRun(payload)
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ payload }) =>
        getEvalRun(payload.id)
      )
      .handle(
        "credentials",
        { permission: Permissions.Evals.Write },
        ({ payload }) => leaseCredentials(payload)
      )
      .handle(
        "reportTrial",
        { permission: Permissions.Evals.Write },
        ({ payload }) => reportTrial(payload)
      )
      .handle(
        "finishRun",
        { permission: Permissions.Evals.Write },
        ({ payload }) => finishReportedRun(payload.id)
      )
      .handle(
        "subscription",
        { permission: Permissions.Evals.Read },
        ({ payload }) => getRunSubscription(payload.id)
      )
      .handle("tail", { permission: Permissions.Evals.Read }, ({ payload }) =>
        readRunTail(payload.id, payload.after)
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
