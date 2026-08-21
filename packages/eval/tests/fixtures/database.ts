/**
 * Whether the database-backed tests may skip.
 *
 * A skipped test reports green, so a suite that quietly drops a third of
 * itself when a variable is unset certifies far less than it appears to. The
 * baseline tests are the whole differentiating feature and every one of them
 * skips without this, which means a reviewer running the suite sees the
 * feature as covered when it is not tested at all.
 *
 * Set `EVAL_REQUIRE_DATABASE=1` in CI so an absent database fails rather than
 * disappears. Locally it stays optional, because a domain change should not
 * need Postgres to check.
 */
const REQUIRED = process.env.EVAL_REQUIRE_DATABASE === "1";

const databaseUrl = process.env.EVAL_TEST_DATABASE_URL;

export const skipWithoutDatabase = () => {
  if (databaseUrl === undefined && REQUIRED) {
    throw new Error(
      "EVAL_TEST_DATABASE_URL is unset and EVAL_REQUIRE_DATABASE=1, so these tests would have skipped silently"
    );
  }

  return databaseUrl === undefined;
};
