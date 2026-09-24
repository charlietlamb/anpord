import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import { listBatches, readBatch, startBatch } from "../../evals/evals";

export const BatchesHandlers = HttpApiBuilder.group(
  PublicApi,
  "batches",
  (handlers) =>
    authorized(handlers)
      .handle("start", { permission: Permissions.Evals.Write }, ({ payload }) =>
        startBatch({ ...payload, local: false, trigger: { source: "api" } })
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ payload }) =>
        readBatch(payload.id)
      )
      .handle("list", { permission: Permissions.Evals.Read }, ({ payload }) =>
        listBatches(payload.cursor ?? null, payload.limit)
      ).done
);
