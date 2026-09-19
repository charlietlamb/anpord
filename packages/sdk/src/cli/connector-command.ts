import { AnpordApi } from "@anpord/schema/public/client";
import { Args, Command, Options, Prompt } from "@effect/cli";
import { Effect, Option, Redacted } from "effect";
import { attended, json, note, row } from "./render";

const asJson = Options.boolean("json").pipe(
  Options.withDescription("Print the result as JSON")
);

const integrationId = Args.text({ name: "integration" }).pipe(
  Args.withDescription("The integration to connect, such as openai")
);

const connectorId = Args.text({ name: "id" }).pipe(
  Args.withDescription("The connector's id")
);

const name = Options.text("name").pipe(
  Options.withDescription("What to call this connector"),
  Options.optional
);

const authMethod = Options.text("auth").pipe(
  Options.withDescription(
    "Which auth method to use, when more than one exists"
  ),
  Options.optional
);

const isDefault = Options.boolean("default").pipe(
  Options.withDescription("Make this the connector the runs use")
);

/* Never an option: a secret in argv is read by every process on the box and
   kept in shell history. It arrives on a prompt or through a pipe. */
const readSecret = (label: string) =>
  Effect.gen(function* () {
    if (yield* attended) {
      return Redacted.value(yield* Prompt.password({ message: label }));
    }

    const piped = yield* Effect.promise(async () => {
      const chunks: Uint8Array[] = [];

      for await (const chunk of process.stdin) {
        chunks.push(chunk as Uint8Array);
      }

      return Buffer.concat(chunks).toString("utf8").trim();
    });

    return piped;
  });

const integrations = Command.make(
  "integrations",
  { asJson },
  ({ asJson: wantsJson }) =>
    Effect.gen(function* () {
      const api = yield* AnpordApi;
      const found = yield* api.connectors.integrations({ payload: {} });

      if (wantsJson) {
        return yield* json(found);
      }

      return yield* Effect.forEach(found, (integration) =>
        row(
          `${integration.id}\t${integration.category}\t${integration.authMethods
            .map((method) => method.id)
            .join(", ")}`
        )
      );
    })
).pipe(Command.withDescription("List the integrations that can be connected"));

const list = Command.make("list", { asJson }, ({ asJson: wantsJson }) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;
    const found = yield* api.connectors.list({ payload: {} });

    if (wantsJson) {
      return yield* json(found);
    }

    if (found.length === 0) {
      return yield* note(
        "No connectors yet. Add one with `anpord connectors add`."
      );
    }

    return yield* Effect.forEach(found, (connector) =>
      row(
        `${connector.id}\t${connector.integrationId}\t${connector.name}${
          connector.isDefault ? "\t(default)" : ""
        }`
      )
    );
  })
).pipe(Command.withDescription("List the connectors this organization has"));

const add = Command.make(
  "add",
  { authMethod, integrationId, isDefault, name },
  ({
    authMethod: wantedMethod,
    integrationId: integration,
    isDefault: wantsDefault,
    name: wantedName,
  }) =>
    Effect.gen(function* () {
      const api = yield* AnpordApi;
      const known = yield* api.connectors.integrations({ payload: {} });
      const found = known.find((entry) => entry.id === integration);

      if (found === undefined) {
        return yield* note(
          `No integration called ${integration}. Run \`anpord connectors integrations\` to see them.`
        );
      }

      const method = Option.match(wantedMethod, {
        onNone: () => found.authMethods[0],
        onSome: (wanted) =>
          found.authMethods.find((entry) => entry.id === wanted),
      });

      if (method === undefined) {
        return yield* note(
          `${integration} has no auth method called ${Option.getOrElse(wantedMethod, () => "")}.`
        );
      }

      if (method.kind === "device") {
        return yield* note(
          `${integration} signs in through a browser. Connect it at https://www.anpord.com/settings/connections.`
        );
      }

      const values: Record<string, string> = {};

      for (const field of method.fields) {
        values[field.name] = yield* readSecret(field.label);
      }

      const created = yield* api.connectors.add({
        payload: {
          authMethodId: method.id,
          integrationId: integration,
          isDefault: wantsDefault,
          name: Option.getOrElse(wantedName, () => found.label),
          scope: "organization",
          values,
        },
      });

      return yield* note(`Connected ${created.integrationId} as ${created.id}`);
    })
).pipe(
  Command.withDescription(
    "Connect an integration. The secret is prompted for, or read from stdin"
  )
);

const remove = Command.make("remove", { connectorId }, ({ connectorId: id }) =>
  Effect.gen(function* () {
    const api = yield* AnpordApi;

    yield* api.connectors.remove({ payload: { id } });

    return yield* note(`Removed ${id}`);
  })
).pipe(Command.withDescription("Remove a connector"));

export const connectors = Command.make("connectors").pipe(
  Command.withDescription("Connect the credentials an eval run needs"),
  Command.withSubcommands([add, integrations, list, remove])
);
