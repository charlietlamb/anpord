#!/usr/bin/env bash
# Removes the credentials created while testing: an API key named local-test
# and any OAuth client registered against localhost. Both are only useful on a
# developer machine, and the OAuth client in particular should not outlive it.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../packages/db"

bun -e '
import { Pool } from "pg";
const env = await Bun.file("../../.env").text();
const url = env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["\x27]|["\x27]$/g, "");
const pool = new Pool({ connectionString: url });

const keys = await pool.query("delete from apikey where name = $1", ["local-test"]);
const apps = await pool.query("delete from oauth_application where redirect_urls like $1", ["%localhost%"]);

process.stdout.write(`removed ${keys.rowCount} api key(s), ${apps.rowCount} oauth client(s)\n`);
await pool.end();
'
