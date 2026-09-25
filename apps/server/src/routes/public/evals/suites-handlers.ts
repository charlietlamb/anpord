import { Permissions } from "@anpord/schema/domain/permissions";
import { PublicApi } from "@anpord/schema/public/api";
import { HttpApiBuilder } from "@effect/platform";
import { authorized } from "../../../http/authorization/authorized-group";
import { listSuites, readSuite } from "../../evals/evals";

const read = { permission: Permissions.Evals.Read };

export const SuitesHandlers = HttpApiBuilder.group(
  PublicApi,
  "suites",
  (handlers) =>
    authorized(handlers)
      .handle("list", read, ({ payload }) =>
        listSuites(payload.cursor ?? null, payload.limit)
      )
      .handle("get", read, ({ payload }) => readSuite(payload.id)).done
);
