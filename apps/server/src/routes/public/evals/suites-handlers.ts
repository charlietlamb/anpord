import { HttpApiBuilder } from "@effect/platform";
import { Permissions } from "@sphynx/schema/domain/permissions";
import { PublicApi } from "@sphynx/schema/public/api";
import { authorized } from "../../../http/authorization/authorized-group";
import { listSuites, readSuite } from "../../evals/catalog-reads";

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
