const runtime = `
import { access, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const exec = (command) => new Promise((resolve, reject) => {
  const child = spawn("/bin/sh", ["-lc", command], { cwd: process.cwd() });
  let stderr = "";
  let stdout = "";
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.on("error", reject);
  child.on("close", code => resolve({ exitCode: code ?? 1, stderr, stdout }));
});

const context = {
  exec,
  exists: path => access(path).then(() => true, () => false),
  readText: path => readFile(path, "utf8"),
  prepared: JSON.parse(process.env.ANPORD_PREPARE_VALUE ?? "{}"),
};

try {
  const raw = await validate(context);
  const result = typeof raw === "boolean" ? { passed: raw } : raw;
  if (typeof result?.passed !== "boolean") throw new Error("A validator must return a boolean or { passed, message? }");
  console.log("ANPORD_VALIDATOR_RESULT=" + JSON.stringify(result));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
`;

export const validatorEntry = (module: string, name: string) =>
  `import { ${name} as validate } from ${JSON.stringify(module)};\n${runtime}`;

const prepareRuntime = `
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { spawn } from "node:child_process";

const exec = (file, args = [], options = {}) => new Promise((resolve, reject) => {
  const child = spawn(file, args, {
    cwd: options.cwd ?? process.cwd(),
    env: { ...process.env, ...options.env },
  });
  let stderr = "";
  let stdout = "";
  let timer;
  if (options.timeoutMs) {
    timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(\`\${file} did not finish within \${options.timeoutMs}ms\`));
    }, options.timeoutMs);
  }
  child.stderr.on("data", chunk => { stderr += chunk; });
  child.stdout.on("data", chunk => { stdout += chunk; });
  child.on("error", error => { clearTimeout(timer); reject(error); });
  child.on("close", code => {
    clearTimeout(timer);
    resolve({ exitCode: code ?? 1, stderr, stdout });
  });
});

const cacheDir = process.env.ANPORD_CACHE_DIR || null;

// Whole archives in and out. What backs cacheDir does not support the renames
// or hard links an install performs, so nothing works inside it directly.
const archiveFor = key => cacheDir + "/" + encodeURIComponent(key) + ".tar.gz";

const cache = cacheDir === null ? null : {
  has: async key => await access(archiveFor(key)).then(() => true, () => false),
  restore: async (key, path) => {
    const archive = archiveFor(key);
    if (!await access(archive).then(() => true, () => false)) return false;
    await rm(path, { force: true, recursive: true });
    await mkdir(path, { recursive: true });
    const { exitCode } = await exec("tar", ["xzf", archive, "-C", path]);
    if (exitCode !== 0) { await rm(path, { force: true, recursive: true }); return false; }
    return true;
  },
  save: async (key, path) => {
    // Written beside the target and moved into place would be the usual care,
    // but the store cannot rename. A partial archive is dropped instead.
    const archive = archiveFor(key);
    const { exitCode, stderr } = await exec("tar", ["czf", archive, "-C", path, "."]);
    if (exitCode !== 0) {
      await rm(archive, { force: true });
      throw new Error("could not save to the cache: " + stderr.trim());
    }
  },
};

const context = {
  cache,
  exec,
  exists: path => access(path).then(() => true, () => false),
  readText: path => readFile(path, "utf8"),
  workspace: process.cwd(),
};

try {
  const value = await setup(context) ?? {};
  console.log("ANPORD_PREPARE_RESULT=" + JSON.stringify(value));
} catch (error) {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
}
`;

export const prepareEntry = (module: string, name: string) =>
  `import { ${name} as setup } from ${JSON.stringify(module)};\n${prepareRuntime}`;

export const definitionEntry = (entry: string) =>
  `import definition from ${JSON.stringify(entry)}; export default definition;`;
