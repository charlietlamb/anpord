import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect, Stream } from "effect";
import type { SandboxHandle } from "../../src/ports/sandbox";
import {
  artifactPaths,
  captureArtifacts,
  MAX_ARTIFACT_BYTES,
} from "../../src/services/capture-artifacts";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((path) => rm(path, { recursive: true, force: true }))
  );
});
const sandbox = {
  exec: (command: string) =>
    Stream.unwrap(
      Effect.promise(async () => {
        const child = Bun.spawn(["/bin/sh", "-c", command], {
          stdout: "pipe",
          stderr: "pipe",
        });
        const [stdout, exitCode] = await Promise.all([
          new Response(child.stdout).text(),
          child.exited,
        ]);
        return Stream.fromIterable([
          { stream: "stdout" as const, data: stdout, at: 0 },
          { stream: "exit" as const, exitCode, at: 0 },
        ]);
      })
    ),
} satisfies Pick<SandboxHandle, "exec">;

const workspace = async () => {
  const path = await mkdtemp(join(tmpdir(), "anpord-artifacts-"));
  roots.push(path);
  return path;
};

test("captures final UTF-8 bytes with a stable content hash", async () => {
  const root = await workspace();
  const content = 'export const name = "Autumn 🍂";\n';
  await writeFile(join(root, "autumn.config.ts"), content);
  const artifacts = await Effect.runPromise(
    captureArtifacts(sandbox, root, [join(root, "autumn.config.ts")])
  );
  expect(artifacts).toEqual([
    {
      path: "autumn.config.ts",
      content,
      byteSize: Buffer.byteLength(content),
      sha256: new Bun.CryptoHasher("sha256").update(content).digest("hex"),
    },
  ]);
});

test("rejects escapes, secrets, oversized/binary files and symlink components", async () => {
  const root = await workspace();
  const outside = await workspace();
  await writeFile(join(outside, "private.ts"), "outside");
  await symlink(join(outside, "private.ts"), join(root, "link.ts"));
  await symlink(outside, join(root, "linked"));
  await writeFile(join(root, "large.ts"), "x".repeat(MAX_ARTIFACT_BYTES + 1));
  await writeFile(
    join(root, "secret.ts"),
    `const apiKey = "sk-${"x".repeat(25)}";`
  );
  await writeFile(join(root, "binary.ts"), new Uint8Array([0, 255]));
  expect(
    await Effect.runPromise(
      captureArtifacts(sandbox, root, [
        "link.ts",
        "linked/private.ts",
        "large.ts",
        "secret.ts",
        "binary.ts",
        join(outside, "private.ts"),
      ])
    )
  ).toEqual([]);
  expect(
    artifactPaths(root, [
      "../a.ts",
      "nested/../../a.ts",
      ".env",
      ".codex/auth.json",
      "node_modules/a.ts",
    ])
  ).toEqual([]);
});
