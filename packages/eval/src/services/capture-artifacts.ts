import { createHash } from "node:crypto";
import { posix } from "node:path";
import type { EvalArtifact } from "@anpord/schema/domain/evals";
import { Effect, Schema, Stream } from "effect";
import { shellQuote } from "../adapters/harness/process";
import type { SandboxHandle } from "../ports/sandbox";

export const MAX_ARTIFACT_BYTES = 128 * 1024;
export const MAX_ARTIFACT_TOTAL_BYTES = 512 * 1024;
export const MAX_ARTIFACT_FILES = 12;
const MAX_RESPONSE = MAX_ARTIFACT_TOTAL_BYTES * 6 + 32_768;
const TEXT_FILE =
  /\.(?:[cm]?[jt]sx?|json|mdx?|txt|ya?ml|toml|css|html|py|rs|go|sh|sql)$/i;
const PRIVATE_PATH =
  /(?:^|\/)(?:\.[^/]+|node_modules|vendor|credentials?|secrets?)(?:\/|$)|(?:^|\/)(?:package-lock\.json|bun\.lock|yarn\.lock|[^/]*(?:secret|credential|auth\.json)[^/]*)$/i;
const SECRET =
  /-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk-[a-zA-Z0-9_-]{20,}|anp_[a-zA-Z0-9]{24,}|AKIA[A-Z0-9]{16})|["']?(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password)["']?\s*[:=]\s*["'][^"'\n]{12,}["']/i;

export const artifactPaths = (workspace: string, paths: readonly string[]) =>
  [...new Set(paths)]
    .flatMap((path) => {
      const relative = posix.isAbsolute(path)
        ? posix.relative(workspace, path)
        : path;
      return !relative.includes("\0") &&
        relative.length <= 512 &&
        !relative.split("/").includes("..") &&
        TEXT_FILE.test(relative) &&
        !PRIVATE_PATH.test(relative)
        ? [relative]
        : [];
    })
    .slice(0, MAX_ARTIFACT_FILES);

/* Open each path component relative to a directory descriptor, refusing symlinks
   and special files. Bound reads before decoding, including growing files. */
export const artifactReadScript = String.raw`
import os, sys, json, stat
root, paths = sys.argv[1], json.loads(sys.argv[2])
result, total = [], 0
for path in paths:
    descriptors = []
    try:
        fd = os.open(root, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        descriptors.append(fd)
        parts = path.split('/')
        if any(p in ('', '.', '..') for p in parts): continue
        for part in parts[:-1]:
            fd = os.open(part, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW, dir_fd=fd)
            descriptors.append(fd)
        fd = os.open(parts[-1], os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=fd)
        descriptors.append(fd)
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > 131072: continue
        data = os.read(fd, 131073)
        if len(data) > 131072 or total + len(data) > 524288 or b'\x00' in data: continue
        content = data.decode('utf-8', errors='strict')
        total += len(data)
        result.append(dict(path=path, content=content, byteSize=len(data)))
    except (OSError, UnicodeError):
        pass
    finally:
        for fd in reversed(descriptors): os.close(fd)
print(json.dumps(result))
`;

export const captureArtifacts = (
  sandbox: Pick<SandboxHandle, "exec">,
  workspace: string,
  changed: readonly string[]
) =>
  Effect.gen(function* () {
    const paths = artifactPaths(workspace, changed);
    if (!paths.length) {
      return [];
    }
    const command = `python3 -I -c ${shellQuote(artifactReadScript)} ${shellQuote(workspace)} ${shellQuote(JSON.stringify(paths))}`;
    let output = "";
    let exitCode: number | null = null;
    yield* sandbox.exec(command, { timeoutMs: 10_000 }).pipe(
      Stream.runForEach((chunk) =>
        Effect.sync(() => {
          if (chunk.stream === "exit") {
            exitCode = chunk.exitCode;
          }
          if (chunk.stream === "stdout") {
            if (output.length + chunk.data.length > MAX_RESPONSE) {
              throw new Error("Artifact response exceeded limit");
            }
            output += chunk.data;
          }
        })
      )
    );
    if (exitCode !== 0) {
      return [];
    }
    const records = yield* Schema.decodeUnknown(
      Schema.parseJson(
        Schema.Array(
          Schema.Struct({
            path: Schema.String,
            content: Schema.String,
            byteSize: Schema.NonNegativeInt,
          })
        ).pipe(Schema.maxItems(MAX_ARTIFACT_FILES))
      )
    )(output);
    let bytes = 0;
    return records.flatMap((record): readonly (typeof EvalArtifact.Type)[] => {
      const byteSize = Buffer.byteLength(record.content);
      bytes += byteSize;
      if (
        !paths.includes(record.path) ||
        byteSize > MAX_ARTIFACT_BYTES ||
        bytes > MAX_ARTIFACT_TOTAL_BYTES ||
        SECRET.test(record.content)
      ) {
        return [];
      }
      return [
        {
          ...record,
          byteSize,
          sha256: createHash("sha256").update(record.content).digest("hex"),
        },
      ];
    });
  }).pipe(
    Effect.timeout("12 seconds"),
    Effect.catchAllCause(() =>
      Effect.logWarning("Artifact capture unavailable").pipe(Effect.as([]))
    ),
    Effect.withSpan("Artifact.capture")
  );
