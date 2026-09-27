const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const QUOTED = /^(["'])(.*)\1$/;

const [raw, name] = process.argv.slice(2);
if (raw === undefined || name === undefined) {
  process.stderr.write("usage: database-url.ts <postgres url> <database>\n");
  process.exit(2);
}
const url = new URL(raw.trim().replace(QUOTED, "$2"));
if (!LOCAL_HOSTS.has(url.hostname)) {
  process.stderr.write(`refusing a non-local database host: ${url.hostname}\n`);
  process.exit(1);
}
url.pathname = `/${name}`;
process.stdout.write(url.toString());
