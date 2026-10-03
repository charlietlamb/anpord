import type { environmentVariable } from "@sphynx/db/schema/credentials/environment-variables";
import { EnvironmentVariable } from "@sphynx/schema/domain/environment";
import { Schema } from "effect";
import { timestamp } from "../repositories/run-view";

export type VariableRow = typeof environmentVariable.$inferSelect;

const SHOWN_PLAIN = 64;
const SHOWN_EDGE = 4;

export const previewOf = (value: string, secret: boolean) => {
  if (!secret) {
    return value.length > SHOWN_PLAIN
      ? `${value.slice(0, SHOWN_PLAIN)}…`
      : value;
  }
  return value.length <= SHOWN_EDGE * 3
    ? "••••••••"
    : `${value.slice(0, SHOWN_EDGE)}…${value.slice(-SHOWN_EDGE)}`;
};

export const summaryOfVariable = (row: VariableRow): EnvironmentVariable =>
  Schema.validateSync(EnvironmentVariable)({
    createdAt: timestamp(row.createdAt),
    id: row.id,
    lastUsedAt: timestamp(row.lastUsedAt),
    name: row.name,
    preview: row.preview,
    revision: row.revision,
    scope: row.scope,
    secret: row.secret,
    updatedAt: timestamp(row.updatedAt),
  });
