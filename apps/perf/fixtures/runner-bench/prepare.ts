import type { Prepare } from "anpord";

export const seedWorkspace: Prepare = async ({ exec }) => {
  const seeded = await exec("bash", [
    "-c",
    "mkdir -p src && for i in $(seq 1 50); do echo line $i > src/f$i.txt; done",
  ]);
  if (seeded.exitCode !== 0) {
    throw new Error(
      `Seeding the bench workspace exited ${seeded.exitCode}:\n${seeded.stderr}`
    );
  }
  return { files: 50 };
};
