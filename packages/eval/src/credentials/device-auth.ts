import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Database } from "@anpord/db/client";
import { credentialAuthAttempt } from "@anpord/db/schema/credentials/auth-attempts";
import { IdGenerator } from "@anpord/ids/id";
import type { Actor } from "@anpord/schema/domain/actor";
import {
  type DeviceAuthChallenge,
  DeviceAuthStatus,
  type StartDeviceAuth,
} from "@anpord/schema/domain/credentials";
import { and, eq } from "drizzle-orm";
import {
  Clock,
  Config,
  Context,
  DateTime,
  Effect,
  Layer,
  Redacted,
  Schema,
} from "effect";
import { tryStore } from "../repositories/query";
import { CredentialCipher } from "./cipher";
import { CredentialConnections } from "./connections";
import { CredentialError } from "./errors";

const DEVICE_TTL_MS = 15 * 60 * 1000;
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const DEVICE_URL = /https:\/\/\S+\/codex\/device/;
const DEVICE_CODE = /\b[A-Z0-9]{4}-[A-Z0-9]{5}\b/;

export const parseDeviceChallenge = (output: string) => {
  const text = output.replace(ANSI, "");
  const verificationUrl = text.match(DEVICE_URL)?.[0];
  const code = text.match(DEVICE_CODE)?.[0];
  return verificationUrl && code ? { code, verificationUrl } : null;
};

const contextOf = (organizationId: string, attemptId: string) =>
  `${organizationId}\0${attemptId}\0codex-device`;

const AttemptState = Schema.Struct({
  connectionId: Schema.NullOr(Schema.String),
});

export interface DeviceAuthShape {
  readonly start: (
    actor: Actor,
    input: StartDeviceAuth
  ) => Effect.Effect<DeviceAuthChallenge, CredentialError>;
  readonly status: (
    actor: Actor,
    id: string
  ) => Effect.Effect<DeviceAuthStatus, CredentialError>;
}

export class DeviceAuth extends Context.Tag("@anpord/eval/DeviceAuth")<
  DeviceAuth,
  DeviceAuthShape
>() {}

export const DeviceAuthLive = Layer.effect(
  DeviceAuth,
  Effect.gen(function* () {
    const cipher = yield* CredentialCipher;
    const connections = yield* CredentialConnections;
    const db = yield* Database;
    const ids = yield* IdGenerator;
    const codex = yield* Config.string("CODEX_BIN_PATH").pipe(
      Config.withDefault("codex")
    );
    const path = yield* Config.string("PATH").pipe(
      Config.withDefault("/usr/local/bin:/usr/bin:/bin")
    );

    const update = (
      id: string,
      values: Partial<typeof credentialAuthAttempt.$inferInsert>
    ) =>
      tryStore("credential.device.update", () =>
        db
          .update(credentialAuthAttempt)
          .set(values)
          .where(eq(credentialAuthAttempt.id, id))
      ).pipe(
        Effect.asVoid,
        Effect.mapError(
          () =>
            new CredentialError({
              code: "internal",
              message: "Credential store is unavailable",
            })
        )
      );

    const finish = (
      id: string,
      values: Partial<typeof credentialAuthAttempt.$inferInsert>
    ) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) =>
          update(id, { ...values, completedAt: new Date(now) })
        )
      );

    return DeviceAuth.of({
      start: (actor, input) =>
        Effect.gen(function* () {
          if (!actor.isUser || input.scope !== "personal") {
            return yield* Effect.fail(
              new CredentialError({
                message: "ChatGPT connections must be personal",
              })
            );
          }

          const attemptId = yield* ids.generate("credentialAuthAttempt");
          const home = yield* Effect.tryPromise({
            catch: () =>
              new CredentialError({
                code: "internal",
                message: "Could not start Codex login",
              }),
            try: () => mkdtemp(join(tmpdir(), "anpord-codex-")),
          });
          const child = yield* Effect.try({
            catch: () =>
              new CredentialError({
                code: "internal",
                message: "Could not start Codex login",
              }),
            try: () =>
              spawn(codex, ["login", "--device-auth"], {
                env: { CODEX_HOME: home, PATH: path },
                stdio: ["ignore", "pipe", "pipe"],
              }),
          });
          const cleanup = Effect.sync(() => child.kill()).pipe(
            Effect.zipRight(
              Effect.promise(() => rm(home, { force: true, recursive: true }))
            ),
            Effect.ignore
          );
          let output = "";
          const completed = new Promise<number>((resolve) => {
            child.once("error", () => resolve(1));
            child.once("exit", (code) => resolve(code ?? 1));
          });
          return yield* Effect.gen(function* () {
            const challenge = yield* Effect.async<
              { code: string; verificationUrl: string },
              CredentialError
            >((resume) => {
              const read = (chunk: Buffer) => {
                output += chunk.toString().replace(ANSI, "");
                const parsed = parseDeviceChallenge(output);
                if (parsed) {
                  resume(Effect.succeed(parsed));
                }
              };
              const failed = () =>
                resume(
                  Effect.fail(
                    new CredentialError({
                      code: "internal",
                      message: "Codex did not return a device code",
                    })
                  )
                );
              child.stdout.on("data", read);
              child.stderr.on("data", read);
              child.once("error", failed);
              child.once("exit", failed);
              return Effect.sync(() => {
                child.stdout.off("data", read);
                child.stderr.off("data", read);
                child.off("error", failed);
                child.off("exit", failed);
              });
            }).pipe(
              Effect.timeoutFail({
                duration: "10 seconds",
                onTimeout: () =>
                  new CredentialError({
                    code: "internal",
                    message: "Codex did not return a device code",
                  }),
              })
            );
            const now = yield* Clock.currentTimeMillis;
            const expiresAt = new Date(now + DEVICE_TTL_MS);
            const sealedState = yield* cipher.seal(
              Redacted.make(JSON.stringify({ connectionId: null })),
              contextOf(actor.organizationId, attemptId)
            );

            yield* tryStore("credential.device.create", () =>
              db.insert(credentialAuthAttempt).values({
                authMethodId: "chatgpt",
                expiresAt,
                id: attemptId,
                integrationId: "codex",
                organizationId: actor.organizationId,
                sealedState,
                status: "pending",
                userId: actor.id,
              })
            ).pipe(
              Effect.mapError(
                () =>
                  new CredentialError({
                    code: "internal",
                    message: "Credential store is unavailable",
                  })
              )
            );
            yield* Effect.logInfo("device login started");

            yield* Effect.forkDaemon(
              Effect.tryPromise({
                catch: () =>
                  new CredentialError({ message: "Codex login failed" }),
                try: async () => {
                  if ((await completed) !== 0) {
                    throw new Error("Codex login failed");
                  }
                  return readFile(join(home, "auth.json"), "utf8");
                },
              }).pipe(
                Effect.flatMap((authJson) =>
                  connections.create(actor, {
                    authMethodId: "chatgpt",
                    integrationId: "codex",
                    isDefault: false,
                    name: input.name,
                    scope: "personal",
                    values: { authJson },
                  })
                ),
                Effect.flatMap((connection) =>
                  cipher
                    .seal(
                      Redacted.make(
                        JSON.stringify({ connectionId: connection.id })
                      ),
                      contextOf(actor.organizationId, attemptId)
                    )
                    .pipe(
                      Effect.flatMap((state) =>
                        finish(attemptId, {
                          sealedState: state,
                          status: "complete",
                        })
                      )
                    )
                ),
                Effect.catchAll(() =>
                  finish(attemptId, { status: "failed" }).pipe(Effect.ignore)
                ),
                Effect.ensuring(cleanup)
              )
            );

            return {
              attemptId,
              code: challenge.code,
              expiresAt: DateTime.unsafeMake(expiresAt.getTime()),
              verificationUrl: challenge.verificationUrl,
            };
          }).pipe(Effect.onError(() => cleanup));
        }).pipe(
          Effect.withSpan("DeviceAuth.start"),
          Effect.annotateLogs({
            integrationId: input.integrationId,
            organizationId: actor.organizationId,
          })
        ),
      status: (actor, id) =>
        tryStore("credential.device.status", () =>
          db
            .select()
            .from(credentialAuthAttempt)
            .where(
              and(
                eq(credentialAuthAttempt.id, id),
                eq(credentialAuthAttempt.organizationId, actor.organizationId),
                eq(credentialAuthAttempt.userId, actor.id)
              )
            )
            .limit(1)
        ).pipe(
          Effect.mapError(
            () =>
              new CredentialError({
                code: "internal",
                message: "Credential store is unavailable",
              })
          ),
          Effect.flatMap((rows) =>
            rows[0] === undefined
              ? Effect.fail(
                  new CredentialError({
                    code: "not-found",
                    message: "Login attempt not found",
                  })
                )
              : Effect.succeed(rows[0])
          ),
          Effect.flatMap((row) =>
            Effect.gen(function* () {
              const sealed = yield* cipher.open(
                row.sealedState,
                contextOf(actor.organizationId, row.id)
              );
              const state = yield* Schema.decodeUnknown(
                Schema.parseJson(AttemptState)
              )(Redacted.value(sealed)).pipe(
                Effect.mapError(
                  () =>
                    new CredentialError({
                      code: "internal",
                      message: "Login attempt is invalid",
                    })
                )
              );
              const now = yield* Clock.currentTimeMillis;
              const status =
                row.status === "pending" && row.expiresAt.getTime() < now
                  ? "expired"
                  : row.status;
              return yield* Schema.decodeUnknown(DeviceAuthStatus)({
                connectionId: state.connectionId,
                status,
              }).pipe(
                Effect.mapError(
                  () =>
                    new CredentialError({
                      code: "internal",
                      message: "Login attempt is invalid",
                    })
                )
              );
            })
          ),
          Effect.withSpan("DeviceAuth.status"),
          Effect.annotateLogs({
            attemptId: id,
            organizationId: actor.organizationId,
          })
        ),
    });
  })
);
