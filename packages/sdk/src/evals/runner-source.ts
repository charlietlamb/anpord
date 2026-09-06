export const validatorEntry = (module: string, name: string) => `
import { ${name} as validate } from ${JSON.stringify(module)};
import { runValidators } from "anpord/validators/runtime";
await runValidators([{ index: 0, name: ${JSON.stringify(name)}, validate }]);`;

export const validatorCaseEntry = (
  entry: string,
  index: number,
  names: readonly { index: number; name: string }[] = []
) =>
  `import definition from ${JSON.stringify(entry)};
import { runValidators } from "anpord/validators/runtime";
const selected = definition.cases[${index}].validate;
const names = ${JSON.stringify(names)};
const checks = (Array.isArray(selected) ? selected : [selected]).flatMap((validate, index) => typeof validate === "function" ? [{ index, name: names.find(check => check.index === index)?.name ?? "Validator " + (index + 1), validate }] : []);
await runValidators(checks, definition.captureValidation !== false);`;

const prepareRuntime = `
import { apiContext } from "anpord/api/context";
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
  api: apiContext,
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

export const mcpEntry = (entry: string, index: number) =>
  `import definition from ${JSON.stringify(entry)};
import { runMcpServer } from "anpord/mcp/runtime";
const server = definition.mcp?.[${index}];
if (server === undefined) throw new Error("MCP server ${index} is missing");
runMcpServer(server);`;

export const cliEntry = (entry: string, index: number) =>
  `import { fileURLToPath } from "node:url";
import definition from ${JSON.stringify(entry)};
import { runCli } from "anpord/cli/runtime";
const cli = definition.cli?.[${index}];
if (cli === undefined) throw new Error("CLI ${index} is missing");
await runCli(cli, fileURLToPath(new URL("../../cli-calls.jsonl", import.meta.url)));`;
