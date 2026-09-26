export interface Migration {
  readonly hash: string;
  readonly sql: string;
  readonly tag: string;
  readonly when: number;
}

export interface Recorded {
  readonly createdAt: number;
  readonly hash: string;
}

export interface Reconciled {
  readonly applied: readonly Migration[];
  readonly edited: readonly Migration[];
  readonly pending: readonly Migration[];
  readonly problems: readonly string[];
}

const dateOf = (when: number) => new Date(when).toISOString();

export const reconcile = (
  migrations: readonly Migration[],
  recorded: readonly Recorded[],
  hasTables: boolean
): Reconciled => {
  if (recorded.length === 0 && hasTables) {
    return {
      applied: [],
      edited: [],
      pending: migrations,
      problems: [
        `This database has tables but no migration history, so it was made with drizzle-kit push, and migrating would fail on tables that already exist. If it matches the current schema, run bun run db:migrate --record ${migrations.at(-1)?.tag ?? "<tag>"}. If it matches an older one, name that migration instead of the last. If it is local and its data does not matter, run bun run db:reset --yes.`,
      ],
    };
  }

  const byWhen = new Map(
    migrations.map((migration) => [migration.when, migration])
  );
  const byHash = new Map(
    migrations.map((migration) => [migration.hash, migration])
  );
  const applied = new Set<Migration>();
  const edited: Migration[] = [];
  const problems: string[] = [];

  for (const row of recorded) {
    const dated = byWhen.get(row.createdAt);
    if (dated !== undefined) {
      applied.add(dated);
      if (dated.hash !== row.hash) {
        edited.push(dated);
      }
      continue;
    }

    const same = byHash.get(row.hash);
    if (same === undefined) {
      problems.push(
        `This database has a migration from ${dateOf(row.createdAt)} that this checkout does not. It was applied from another branch. Check out or merge that branch, then migrate again.`
      );
      continue;
    }

    applied.add(same);
    problems.push(
      `This database recorded ${same.tag} as ${row.createdAt}, but the journal now dates it ${same.when}, so drizzle would run it again. Fix the record with: update drizzle.__drizzle_migrations set created_at = ${same.when} where hash = '${same.hash}';`
    );
  }

  const latest = migrations.findLast((migration) => applied.has(migration));
  const pending = migrations.filter((migration) => !applied.has(migration));

  for (const gap of pending.filter(
    (migration) => latest !== undefined && migration.when < latest.when
  )) {
    problems.push(
      `${gap.tag} never ran here, but ${latest?.tag} after it did, so drizzle would skip it for good. If the database already has its changes, record it with bun run db:migrate --record ${gap.tag}. Otherwise apply drizzle/${gap.tag}.sql with psql first, then record it.`
    );
  }

  return { applied: [...applied], edited, pending, problems };
};

export const throughTag = (
  migrations: readonly Migration[],
  pending: readonly Migration[],
  tag: string
) => {
  const last = migrations.findIndex((migration) => migration.tag === tag);
  return last === -1
    ? undefined
    : pending.filter((migration) => migrations.indexOf(migration) <= last);
};
