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

const readOrEmpty = (path) =>
  path === undefined ? Promise.resolve("") : readFile(path, "utf8").then(text => text, () => "");

const context = {
  answer: () => readOrEmpty(process.env.ANPORD_ANSWER_FILE),
  exec,
  exists: path => access(path).then(() => true, () => false),
  readText: path => readFile(path, "utf8"),
  prepared: JSON.parse(process.env.ANPORD_PREPARE_VALUE ?? "{}"),
  transcript: () => readOrEmpty(process.env.ANPORD_TRANSCRIPT_FILE),
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
import { access, readFile } from "node:fs/promises";
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

const context = {
  cached: process.env.ANPORD_CACHE_RESTORED === "1",
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
