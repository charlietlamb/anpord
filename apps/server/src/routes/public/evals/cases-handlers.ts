import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import { listCases, readCase, runCase } from "../../evals/evals";

export const CasesHandlers = HttpApiBuilder.group(
  PublicApi,
  "cases",
  (handlers) =>
    authorized(handlers)
      .handle("list", { permission: Permissions.Evals.Read }, ({ payload }) =>
        listCases({
          cursor: payload.cursor ?? null,
          limit: payload.limit,
          order: payload.order ?? "desc",
          q: payload.q?.trim() || null,
          sort: payload.sort ?? "recent",
          suite: payload.suite ?? null,
          tag: payload.tag ?? null,
        })
      )
      .handle("get", { permission: Permissions.Evals.Read }, ({ payload }) =>
        readCase(payload.id)
      )
      .handle("run", { permission: Permissions.Evals.Write }, ({ payload }) =>
        runCase(
          payload.id,
          { trials: payload.trials, variants: payload.variants },
          { hostedOnly: true, trigger: { source: "api" } }
        )
      ).done
);
